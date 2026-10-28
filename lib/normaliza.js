// Normalização e agrupamento de verbos.
// O banco guarda o original; o agrupamento acontece só na exibição.
import { EVENTO } from '../assets/evento.js';

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Primeira palavra, só letras. Devolve { chave (sem acento), exib (com acento, minúscula) }
export function limparVerbo(texto) {
  const t = String(texto || '').trim().toLowerCase().split(/[\s,;/]+/)[0] || '';
  const exib = t.replace(/[^a-záàâãéêíóôõúüç]/g, '');
  return { exib, chave: semAcento(exib) };
}

const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a', '$': 's' };
export function ehBloqueado(texto) {
  const t = semAcento(String(texto || '').toLowerCase()).replace(/[01345@$]/g, (c) => LEET[c]).replace(/[^a-z]/g, '');
  if (!t) return false;
  return EVENTO.palavrasBloqueadas.some((p) => (p.endsWith('*') ? t.startsWith(p.slice(0, -1)) : t === p));
}

// Distância de Damerau-Levenshtein (transposição conta 1)
export function distancia(a, b) {
  const la = a.length, lb = b.length;
  const d = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) d[i][0] = i;
  for (let j = 0; j <= lb; j++) d[0][j] = j;
  for (let i = 1; i <= la; i++) for (let j = 1; j <= lb; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[la][lb];
}

const ehInfinitivo = (k) => /(ar|er|ir|or)$/.test(k) && k.length >= 4;

// Terminações de flexão por conjugação (sobre o radical do infinitivo)
const SUFIXOS = {
  ar: ['o', 'a', 'as', 'amos', 'am', 'ando', 'ado', 'ada', 'ados', 'adas', 'ei', 'ou', 'aram', 'arei', 'ara', 'aria', 'e', 'es', 'emos', 'em', 'aremos', 'arao'],
  er: ['o', 'e', 'es', 'emos', 'em', 'endo', 'ido', 'ida', 'idos', 'idas', 'i', 'eu', 'eram', 'erei', 'era', 'eria', 'a', 'as', 'amos', 'am', 'eremos', 'erao'],
  ir: ['o', 'e', 'es', 'imos', 'em', 'indo', 'ido', 'ida', 'idos', 'idas', 'i', 'iu', 'iram', 'irei', 'ira', 'iria', 'a', 'as', 'amos', 'am', 'iremos', 'irao'],
  or: ['o', 'oe', 'oem', 'ondo', 'osto', 'us', 'unha'],
};

function flexaoDe(k, infinitivos) {
  let melhor = null;
  for (const inf of infinitivos) {
    if (inf === k) continue;
    const conj = inf.slice(-2);
    const radical = inf.slice(0, -2);
    if (radical.length < 3 || !k.startsWith(radical)) continue;
    const resto = k.slice(radical.length);
    if (SUFIXOS[conj].includes(resto)) { if (!melhor || inf.length > melhor.length) melhor = inf; }
  }
  return melhor;
}

// rows: [{ pilar, chave, exib, n }] (n = quantidade), overrides: Map(chave -> {destino, rotulo})
// Retorna lista de grupos: [{ pilar, chave, rotulo, n, membros: [chaves] }]
export function agrupar(rows, overrides = new Map()) {
  // 1. frequência global por chave
  const freq = new Map();
  for (const r of rows) freq.set(r.chave, (freq.get(r.chave) || 0) + r.n);

  // 2. mapa chave -> chave-alvo
  const alvo = new Map();
  const chaves = [...freq.keys()];
  const infinitivos = chaves.filter(ehInfinitivo);

  // flexão -> infinitivo (só se o infinitivo já existe entre as respostas)
  for (const k of chaves) {
    const inf = flexaoDe(k, infinitivos);
    if (inf) alvo.set(k, inf);
  }
  // erro de digitação: distância ≤ 1, palavra menos frequente NÃO parece infinitivo válido
  for (const k of chaves) {
    if (alvo.has(k) || k.length < 5) continue;
    if (ehInfinitivo(k)) continue; // verbo real parecido (aceitar × acertar) não junta
    let melhor = null;
    for (const j of chaves) {
      if (j === k || alvo.has(j) || j.length < 5) continue;
      if (distancia(k, j) <= 1 && (freq.get(j) > freq.get(k) || (freq.get(j) === freq.get(k) && j < k))) {
        if (!melhor || freq.get(j) > freq.get(melhor)) melhor = j;
      }
    }
    if (melhor) alvo.set(k, melhor);
  }
  // overrides do admin (unir manual) têm a última palavra
  for (const [k, o] of overrides) if (o.destino && freq.has(k)) alvo.set(k, o.destino);

  const resolver = (k) => { let x = k, i = 0; while (alvo.has(x) && i++ < 5) x = alvo.get(x); return x; };

  // 3. rótulo = forma original mais comum do alvo
  const formas = new Map();      // alvo -> Map(exib -> n), todas as formas do grupo
  const formasAlvo = new Map();  // alvo -> Map(exib -> n), só as escritas como o próprio alvo
  for (const r of rows) {
    const a = resolver(r.chave);
    if (!formas.has(a)) formas.set(a, new Map());
    formas.get(a).set(r.exib, (formas.get(a).get(r.exib) || 0) + r.n);
    if (r.chave === a) {
      if (!formasAlvo.has(a)) formasAlvo.set(a, new Map());
      formasAlvo.get(a).set(r.exib, (formasAlvo.get(a).get(r.exib) || 0) + r.n);
    }
  }
  const topo = (m) => [...m.entries()].sort((x, y) => y[1] - x[1])[0][0];
  const rotuloDe = (a) => {
    const o = overrides.get(a);
    if (o && o.rotulo) return o.rotulo;
    // O rótulo é a forma do verbo-alvo (ex.: "escutar"), mesmo que flexões sejam mais frequentes.
    return formasAlvo.has(a) ? topo(formasAlvo.get(a)) : topo(formas.get(a));
  };

  // 4. grupos por (pilar, alvo)
  const grupos = new Map();
  for (const r of rows) {
    const a = resolver(r.chave);
    const id = `${r.pilar}|${a}`;
    if (!grupos.has(id)) grupos.set(id, { pilar: r.pilar, chave: a, rotulo: rotuloDe(a), n: 0, membros: new Set() });
    const g = grupos.get(id);
    g.n += r.n; g.membros.add(r.chave);
  }
  return [...grupos.values()].map((g) => ({ ...g, membros: [...g.membros] }))
    .sort((a, b) => b.n - a.n || a.rotulo.localeCompare(b.rotulo));
}

export const capitalizar = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
