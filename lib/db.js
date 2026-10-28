import postgres from 'postgres';

let sql = null;
let pronto = null;

// Detecta a URL do banco por qualquer variável terminada em DATABASE_URL / POSTGRES_URL
// (a integração Vercel + Neon pode criar com prefixo).
function acharUrl() {
  const chaves = Object.keys(process.env).filter((k) => /(DATABASE_URL|POSTGRES_URL)$/.test(k));
  const preferida = chaves.find((k) => /^(DATABASE_URL|POSTGRES_URL)$/.test(k)) || chaves.find((k) => !/NON_POOLING|UNPOOLED/.test(k)) || chaves[0];
  return preferida ? process.env[preferida] : null;
}

export function banco() {
  if (sql) return sql;
  const url = acharUrl();
  if (!url) throw new Error('Banco não configurado: defina DATABASE_URL (ou integre o Neon na Vercel).');
  const local = /@(localhost|127\.0\.0\.1)/.test(url);
  sql = postgres(url, { max: 1, prepare: false, ssl: local ? false : 'require', idle_timeout: 20, connect_timeout: 15 });
  return sql;
}

// Cria as tabelas na primeira chamada, tolerando corrida entre funções simultâneas.
export async function garantirTabelas() {
  if (pronto) return pronto;
  const db = banco();
  pronto = (async () => {
    const comandos = [
      `create table if not exists respostas (
         id bigserial primary key,
         envio_id text unique,
         pilar smallint not null,
         verbo_original text not null,
         verbo_exib text not null,
         chave text not null,
         area text,
         aparelho text,
         status text not null default 'visivel',
         criado_em timestamptz not null default now()
       )`,
      `create index if not exists respostas_status_idx on respostas (status)`,
      `create index if not exists respostas_aparelho_idx on respostas (aparelho)`,
      `create table if not exists config (chave text primary key, valor text not null)`,
      `create table if not exists agrupamento (
         chave text primary key,
         destino text,
         rotulo text
       )`,
      `insert into config (chave, valor) values ('coleta_aberta', 'true') on conflict do nothing`,
    ];
    for (const c of comandos) {
      try { await db.unsafe(c); } catch (e) {
        if (!['23505', '42P07', '42710'].includes(e.code)) { pronto = null; throw e; }
      }
    }
  })();
  return pronto;
}

export async function coletaAberta() {
  const db = banco();
  const r = await db`select valor from config where chave = 'coleta_aberta'`;
  return !r.length || r[0].valor === 'true';
}
