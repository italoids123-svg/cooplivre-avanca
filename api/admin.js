import { createHash, timingSafeEqual } from 'node:crypto';
import { EVENTO, pilarPorId } from '../assets/evento.js';
import { banco, garantirTabelas, coletaAberta } from '../lib/db.js';
import { limparVerbo, ehBloqueado, agrupar } from '../lib/normaliza.js';

const hash = (s) => createHash('sha256').update(String(s)).digest();

function autorizado(req) {
  const senha = process.env.ADMIN_PASSWORD;
  if (!senha) return false;
  const dado = req.headers['x-admin-key'];
  if (!dado) return false;
  return timingSafeEqual(hash(dado), hash(senha));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ erro: 'sem_senha', mensagem: 'ADMIN_PASSWORD não configurada no servidor.' });
  if (!autorizado(req)) return res.status(401).json({ erro: 'nao_autorizado' });

  try {
    await garantirTabelas();
    const db = banco();

    if (req.method === 'GET') {
      const [linhas, ovs, aberta] = await Promise.all([
        db`select id, pilar, verbo_original, verbo_exib, chave, area, status, criado_em from respostas order by id desc`,
        db`select chave, destino, rotulo from agrupamento`,
        coletaAberta(),
      ]);
      const overrides = new Map(ovs.map((o) => [o.chave, o]));
      const visiveis = linhas.filter((l) => l.status === 'visivel')
        .reduce((m, l) => { const k = `${l.pilar}|${l.chave}|${l.verbo_exib}`; m.set(k, (m.get(k) || { pilar: l.pilar, chave: l.chave, exib: l.verbo_exib, n: 0 })); m.get(k).n++; return m; }, new Map());
      const grupos = agrupar([...visiveis.values()], overrides);
      // grupo de cada resposta (para o CSV e a tabela)
      const mapaGrupo = new Map();
      for (const g of grupos) for (const m of g.membros) mapaGrupo.set(`${g.pilar}|${m}`, g.rotulo);
      return res.status(200).json({
        coleta_aberta: aberta,
        respostas: linhas.map((l) => ({
          id: Number(l.id), pilar: l.pilar, original: l.verbo_original, verbo: l.verbo_exib, chave: l.chave,
          area: l.area, status: l.status, criado_em: l.criado_em,
          grupo: l.status === 'visivel' ? (mapaGrupo.get(`${l.pilar}|${l.chave}`) || l.verbo_exib) : '',
        })),
        grupos,
        overrides: ovs,
      });
    }

    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const ids = Array.isArray(b.ids) ? b.ids.map(Number).filter(Number.isFinite) : (b.id ? [Number(b.id)] : []);

      switch (b.acao) {
        case 'ocultar':
          await db`update respostas set status = 'oculto' where id = any(${ids})`; break;
        case 'mostrar':
        case 'liberar':
          await db`update respostas set status = 'visivel' where id = any(${ids})`; break;
        case 'apagar':
          await db`delete from respostas where id = any(${ids})`; break;
        case 'editar': {
          const id = ids[0];
          const atual = (await db`select * from respostas where id = ${id}`)[0];
          if (!atual) return res.status(404).json({ erro: 'nao_encontrado' });
          let { pilar, verbo_original, verbo_exib, chave } = atual;
          if (b.pilar && pilarPorId(b.pilar)) pilar = Number(b.pilar);
          if (typeof b.verbo === 'string') {
            const l = limparVerbo(b.verbo);
            if (l.exib.length < 2) return res.status(400).json({ erro: 'verbo' });
            verbo_original = b.verbo.slice(0, 60); verbo_exib = l.exib; chave = l.chave;
          }
          const status = ehBloqueado(verbo_exib) ? 'bloqueado' : atual.status;
          await db`update respostas set pilar = ${pilar}, verbo_original = ${verbo_original}, verbo_exib = ${verbo_exib}, chave = ${chave}, status = ${status} where id = ${id}`;
          break;
        }
        case 'unir': { // une várias chaves em um destino
          const { de = [], para } = b;
          if (!para) return res.status(400).json({ erro: 'destino' });
          for (const k of de) {
            if (k === para) continue;
            await db`insert into agrupamento (chave, destino) values (${k}, ${para})
                     on conflict (chave) do update set destino = excluded.destino`;
          }
          break;
        }
        case 'desunir':
          await db`update agrupamento set destino = null where chave = ${b.chave}`; break;
        case 'renomear':
          await db`insert into agrupamento (chave, rotulo) values (${b.chave}, ${String(b.rotulo || '').slice(0, 30) || null})
                   on conflict (chave) do update set rotulo = excluded.rotulo`; break;
        case 'coleta':
          await db`insert into config (chave, valor) values ('coleta_aberta', ${b.aberta ? 'true' : 'false'})
                   on conflict (chave) do update set valor = excluded.valor`; break;
        case 'apagar_tudo':
          if (b.confirmacao !== 'APAGAR') return res.status(400).json({ erro: 'confirmacao', mensagem: 'Digite APAGAR para confirmar.' });
          await db`truncate respostas restart identity`;
          await db`delete from agrupamento`;
          break;
        default:
          return res.status(400).json({ erro: 'acao_desconhecida' });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erro: 'metodo' });
  } catch (e) {
    console.error('admin:', e);
    return res.status(500).json({ erro: 'servidor', mensagem: String(e.message || e) });
  }
}
