import { EVENTO, pilarPorId } from '../assets/evento.js';
import { banco, garantirTabelas, coletaAberta } from '../lib/db.js';
import { limparVerbo, ehBloqueado, agrupar } from '../lib/normaliza.js';

const AREAS_OK = new Set(EVENTO.areas.map((a) => a.id));

export default async function handler(req, res) {
  try {
    await garantirTabelas();
    const db = banco();

    // ---------- GET: público, só o que está visível ----------
    if (req.method === 'GET') {
      const aberta = await coletaAberta();
      if (req.query && req.query.estado) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ coleta_aberta: aberta, agora: Date.now() });
      }
      const [linhas, ovs, recentes, tot] = await Promise.all([
        db`select pilar, chave, verbo_exib as exib, count(*)::int as n
             from respostas where status = 'visivel' group by pilar, chave, verbo_exib`,
        db`select chave, destino, rotulo from agrupamento`,
        db`select id, pilar, verbo_exib as exib from respostas where status = 'visivel' order by id desc limit 6`,
        db`select count(*)::int as n from respostas where status = 'visivel'`,
      ]);
      const overrides = new Map(ovs.map((o) => [o.chave, o]));
      const grupos = agrupar(linhas, overrides).map((g) => ({ pilar: g.pilar, rotulo: g.rotulo, n: g.n }));
      res.setHeader('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=2');
      return res.status(200).json({
        coleta_aberta: aberta,
        total: tot[0].n,
        grupos,
        recentes: recentes.reverse().map((r) => ({ id: Number(r.id), pilar: r.pilar, rotulo: r.exib })),
      });
    }

    // ---------- POST: envio do participante ----------
    if (req.method === 'POST') {
      res.setHeader('Cache-Control', 'no-store');
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      if (!(await coletaAberta())) return res.status(403).json({ erro: 'encerrada', mensagem: 'A coleta foi encerrada.' });

      const pilar = Number(b.pilar);
      if (!pilarPorId(pilar)) return res.status(400).json({ erro: 'pilar', mensagem: 'Escolha um pilar.' });

      const { exib, chave } = limparVerbo(b.verbo);
      if (exib.length < EVENTO.verboMin) return res.status(400).json({ erro: 'verbo', mensagem: `Escreva um verbo com pelo menos ${EVENTO.verboMin} letras.` });
      if (exib.length > EVENTO.verboMax) return res.status(400).json({ erro: 'verbo', mensagem: `Use no máximo ${EVENTO.verboMax} letras.` });

      const area = AREAS_OK.has(b.area) ? b.area : null;
      const aparelho = String(b.aparelho || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || null;
      const envio = String(b.envio_id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || null;

      // Reenvio por queda de rede: mesmo envio_id nunca duplica
      if (envio) {
        const ja = await db`select 1 from respostas where envio_id = ${envio}`;
        if (ja.length) return res.status(200).json({ ok: true, repetido: true });
      }
      if (aparelho) {
        const c = await db`select count(*)::int as n from respostas where aparelho = ${aparelho}`;
        if (c[0].n >= EVENTO.maxPorAparelho) {
          return res.status(429).json({ erro: 'limite', mensagem: `Cada celular pode enviar até ${EVENTO.maxPorAparelho} compromissos.` });
        }
      }

      // Segura para moderação: palavrão (inclusive disfarçado com números/símbolos) e
      // qualquer verbo com algo além de letras, que é o jeito comum de burlar o filtro.
      const bruto = String(b.verbo || '').trim().split(/\s+/)[0];
      const suspeito = /[^a-zA-ZÀ-ÿ]/.test(bruto);
      const status = (ehBloqueado(bruto) || suspeito) ? 'bloqueado' : 'visivel';
      await db`insert into respostas (envio_id, pilar, verbo_original, verbo_exib, chave, area, aparelho, status)
               values (${envio}, ${pilar}, ${String(b.verbo).slice(0, 60)}, ${exib}, ${chave}, ${area}, ${aparelho}, ${status})
               on conflict (envio_id) do nothing`;
      // Palavra bloqueada: o participante vê sucesso normal (não ensina a burlar o filtro)
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erro: 'metodo' });
  } catch (e) {
    console.error('respostas:', e);
    return res.status(500).json({ erro: 'servidor', mensagem: 'Falha temporária. Tente de novo.' });
  }
}
