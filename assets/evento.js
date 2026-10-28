// ============================================================================
//  EVENTO · Avança Cooplivre 27–30  ·  FONTE ÚNICA de textos, pilares, regras
//  Importado pelo servidor (api/*) e pelas três telas (/, /telao, /admin).
//  Para trocar texto, cor ou regra, mexa SÓ aqui.
// ============================================================================

export const EVENTO = {
  nome: 'Avança Cooplivre 27–30',
  dataTexto: '14/11/2026',
  mote: 'Legado e Futuro',

  // Pergunta que o participante responde
  pergunta: 'Como eu posso contribuir para que a ambição seja vivida na prática?',
  instrucao: 'Escolha o pilar em que você vai agir e escreva um verbo de ação.',

  // Regras de envio
  maxPorAparelho: 3,      // quantos compromissos cada celular pode enviar
  verboMin: 3,            // mínimo de letras
  verboMax: 20,           // máximo de letras
  pollingMs: 3000,        // telão consulta o banco a cada 3 s

  // Dicas leves (não bloqueiam o envio)
  verbosGenericos: ['apoiar', 'ajudar', 'contribuir', 'colaborar', 'fazer', 'participar',
                    'melhorar', 'trabalhar', 'cooperar', 'tentar', 'buscar'],
  exemplosVerbo: ['escutar', 'treinar', 'reconhecer', 'simplificar', 'planejar', 'orientar'],

  // Áreas (opcional, agregado em nível de diretoria para proteger o anonimato).
  // Nunca usar área pequena: com poucas pessoas a resposta deixa de ser anônima.
  areas: [
    { id: 'negocios',  nome: 'Negócios e Postos de Atendimento' },
    { id: 'adm',       nome: 'Administrativa' },
    { id: 'fin',       nome: 'Financeira' },
    { id: 'conselho',  nome: 'Conselho e Diretoria' },
  ],

  // Pilares do Plano Estratégico 2027–2030.
  //  cor       = cor oficial do site do plano (celular, relatório, admin)
  //  corTelao  = versão luminosa para o fundo escuro do telão (legível da última fila)
  //  ambicao   = FRASE DE AMBIÇÃO do workshop. PENDENTE: preencher com a frase oficial.
  //              Enquanto vazio, as telas usam `desc` (descrição do pilar no site do plano).
  pilares: [
    { id: 1, nome: 'Pessoas Protagonistas',          curto: 'Pessoas',
      sub: 'Gente que faz acontecer',
      desc: 'Desenvolver pessoas protagonistas que entregam resultado, com lideranças preparadas, reconhecimento justo e orgulho de pertencer.',
      ambicao: '', cor: '#003541', corTelao: '#8E86FF' },
    { id: 2, nome: 'Processos Eficientes',           curto: 'Processos',
      sub: 'Agilidade e simplicidade',
      desc: 'Tornar a operação simples, digital e orientada por dados, com conhecimento preservado e melhoria contínua feita pelo time.',
      ambicao: '', cor: '#757A7D', corTelao: '#C4CACD' },
    { id: 3, nome: 'Sustentabilidade Financeira',    curto: 'Sustentabilidade',
      sub: 'Solidez para crescer',
      desc: 'Crescer com solidez: capital social fortalecido, liquidez equilibrada no longo prazo e eficiência na gestão dos recursos.',
      ambicao: '', cor: '#008852', corTelao: '#56CC5E' },
    { id: 4, nome: 'Relacionamento & Principalidade', curto: 'Relacionamento',
      sub: 'Principalidade e confiança',
      desc: 'Ser a primeira escolha financeira do cooperado, com benefício econômico real e um atendimento que faz diferença no resultado.',
      ambicao: '', cor: '#006F7D', corTelao: '#2AA6E0' },
    { id: 5, nome: 'Cooperativismo & Comunidade',    curto: 'Cooperativismo',
      sub: 'Desenvolvimento local',
      desc: 'Transformar resultado em desenvolvimento local, com educação, parcerias, cooperados participativos e governança preparada para o futuro.',
      ambicao: '', cor: '#0DA898', corTelao: '#2DE2C0' },
  ],

  // Marca
  marca: {
    verdeLimao: '#C6E03A',
    roxo: '#4B3C91',
    teal: '#0EAF9E',
    petroleo: '#00353E',
    fundoTelao: '#06262C',
  },

  // Palavras bloqueadas (comparadas sem acento, minúsculas, com troca de 0→o, 1→i, 3→e, 4→a, 5→s, @→a).
  // Termo terminado em * bloqueia qualquer palavra que COMECE com ele.
  palavrasBloqueadas: [
    'porra', 'merda', 'bosta', 'caralh*', 'cacete', 'puta', 'puto', 'putaria', 'foda', 'fod*',
    'buceta', 'bucet*', 'viad*', 'otario', 'idiota', 'imbecil', 'babaca', 'retardad*', 'cuzao',
    'arrombad*', 'desgraca*', 'vagabund*', 'safad*', 'corno', 'cretino', 'burro', 'lixo',
    'nazi*', 'estupr*', 'matar', 'morte', 'racis*',
  ],
};

export const pilarPorId = (id) => EVENTO.pilares.find((p) => p.id === Number(id));

// Cor de texto com contraste calculado (luminância relativa WCAG)
export function luminancia(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function corTextoSobre(hex) {
  const l = luminancia(hex);
  const contrasteEscuro = (l + 0.05) / (luminancia('#06262C') + 0.05);
  const contrasteClaro = 1.05 / (l + 0.05);
  return contrasteEscuro >= contrasteClaro ? '#06262C' : '#FFFFFF';
}
