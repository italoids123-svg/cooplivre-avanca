# Avança Cooplivre 27–30 · Árvore do Legado e Futuro

Dinâmica interativa ao vivo para o evento de **14/11/2026 (Legado e Futuro)**.

Pergunta: **"Como eu posso contribuir para que a ambição seja vivida na prática?"**
Cada pessoa escolhe 1 dos 5 pilares e escreve um **verbo de ação**. No telão, cada verbo vira um fruto na copa da árvore, na cor do pilar. Verbos repetidos crescem (×N). As raízes mostram o total por pilar.

| Tela | Endereço | Quem usa |
|---|---|---|
| Participante (celular) | `/` | Todo o público, via QR code |
| Telão / painel de LED | `/telao` | Projeção (abrir em tela cheia) |
| Moderação | `/admin` | Equipe (senha) |
| Relatório executivo | `/relatorio` | Equipe, depois do evento (imprimir como PDF) |

## Anonimato (LGPD)
Guardamos só: pilar, verbo, diretoria (opcional, nível agregado) e um identificador aleatório do aparelho, usado apenas para limitar 3 envios por celular. Nenhum nome, matrícula ou dado pessoal. O relatório não exibe recortes com menos de 5 respostas.

## Telão: atalhos e parâmetros
- **F** tela cheia · **T** tema escuro/claro · **Q** QR grande para o convite · **P** baixa o PNG da árvore (imagem final)
- `?tema=claro` projetor com muita luz ambiente (padrão é escuro, melhor para painel de LED)
- `?demo=60` simula respostas sem banco (para testar o visual) · `?ritmo=900` velocidade da simulação
- `?intervalo=3000` frequência de leitura do banco, em ms
- `?url=https://link-curto` troca o endereço do QR (use um link curto se tiver)
- Controles e cursor somem após 2,5 s parado.

## Moderação (/admin)
- Filtro automático: palavrão ou verbo com número/símbolo entra como **bloqueado** (o participante vê sucesso normal; a equipe vê e decide se libera).
- **Ocultar / Mostrar / Liberar / Editar / Apagar**, individual ou em lote.
- Aba **Agrupado**: o sistema junta flexões (escuto, escutando → escutar) e erros de digitação (escutra). Só junta flexão se o infinitivo já existe entre as respostas. "Aceitar" e "acertar" ficam separados. Use **Renomear** e **Unir em…** para o que sobrar.
- **Encerrar coleta**: o celular mostra agradecimento e o servidor recusa novos envios.
- **Exportar CSV** (UTF-8 com BOM, separador `;`, abre direto no Excel).
- **Apagar tudo** exige digitar APAGAR. Use depois do ensaio.

## Para pôr no ar (uma vez, ~15 min)
Use contas **da Thutor** (e-mail institucional), não contas pessoais.

1. **GitHub**: crie o repositório (privado) e suba esta pasta:
   ```bash
   cd ~/Cooplivre-Avanca
   git init && git add . && git commit -m "Avança Cooplivre: dinâmica ao vivo"
   git branch -M main
   git remote add origin https://github.com/ORGANIZACAO/cooplivre-avanca.git
   git push -u origin main
   ```
   Se a Vercel mostrar deploy **Blocked**, o e-mail do commit não é reconhecido: rode `git config user.email "ID+LOGIN@users.noreply.github.com"` e refaça o commit, ou use Redeploy no painel. Se o git reclamar de `index.lock`: `rm -f .git/index.lock`.
2. **Vercel (plano Pro)**: Add New → Project → importe o repositório → *Framework Preset: Other* → Deploy. O plano Hobby é só para uso não comercial e não serve para projeto de cliente.
3. **Banco (Neon)**: na Vercel, aba *Storage* → Neon → região **AWS São Paulo (sa-east-1)**. A integração cria a variável `DATABASE_URL` sozinha. As tabelas são criadas na primeira chamada.
4. **Senha do admin**: *Settings → Environment Variables* → `ADMIN_PASSWORD` (escolha uma forte, só para a equipe).
5. **Redeploy** (Deployments → ⋯ → Redeploy) para as variáveis valerem.
6. Abra `/telao?demo=60` para ver o visual e `/admin` para testar a senha.

As funções rodam em São Paulo (`gru1`, em `vercel.json`).

## Antes do evento (checklist)
- [ ] **Preencher as frases de ambição** em `assets/evento.js` (campo `ambicao` de cada pilar). Enquanto vazio, o celular mostra a descrição do pilar.
- [ ] **Rede**: Wi-Fi dedicado ou plano B no 4G. Com 200+ celulares, Wi-Fi comum de local de evento é o maior risco. Ensaiar no local.
- [ ] Ensaio com 5–10 celulares em 4G e Wi-Fi: enviar, ver no telão, ocultar, testar palavra bloqueada.
- [ ] Ler o QR do fundo da sala, no painel real. Se ficar pequeno, usar **Q** para o QR grande.
- [ ] Confirmar tipo e resolução do telão (16:9, LED ultralargo, vertical). O layout se adapta, mas conferir a legibilidade da última fila.
- [ ] **Teste de carga em produção** (300 e 1.000 envios simultâneos) e depois **Apagar tudo**. O teste local feito aqui (1.000 simultâneos, 0 erros) usou uma conexão de banco só e não substitui este.
- [ ] Abrir o telão **10 min antes** (o Neon hiberna quando ocioso). Se publicar uma nova versão, recarregar o telão com Ctrl/Cmd+Shift+R.
- [ ] Telão em tela cheia, sem descanso de tela. Uma pessoa dedicada ao `/admin`.
- [ ] Facilitador ao lado do painel, provocando verbos concretos (escutar, treinar), não genéricos (apoiar, ajudar).
- [ ] Apagar os dados do ensaio com **Apagar tudo**, deixar a coleta **Aberta**.

## Depois do evento
1. **Encerrar coleta** no admin.
2. Telão: tecla **P** baixa o PNG final da árvore.
3. Admin: **Exportar CSV**.
4. `/relatorio`: **Imprimir / salvar como PDF** (2 páginas, A4 paisagem).

## Estrutura
```
assets/evento.js   ← FONTE ÚNICA: pergunta, pilares, cores, regras, palavras bloqueadas
assets/logos/      ← logos Avança Cooplivre (escuro, branco, roxo)
assets/qrcode.js   ← gerador de QR local (não depende de internet)
api/respostas.js   ← envio (POST) e leitura pública (GET)
api/admin.js       ← moderação (cabeçalho x-admin-key = ADMIN_PASSWORD)
lib/db.js          ← conexão Postgres + criação das tabelas
lib/normaliza.js   ← agrupamento de verbos e filtro de palavrões
index.html · telao.html · admin.html · relatorio.html
dev-server.mjs     ← servidor local que imita a Vercel
```

## Rodar localmente
```bash
npm install
DATABASE_URL=postgres://usuario@localhost:5432/banco ADMIN_PASSWORD=teste node dev-server.mjs
# http://localhost:3000   (/telao?demo=60 funciona sem banco)
```

## Cores do telão
O celular e o relatório usam as cores oficiais do site do plano. O telão usa versões mais luminosas, para serem lidas da última fila no fundo escuro. **Pessoas** passa de azul-petróleo (que some no fundo escuro) para um violeta próximo do roxo da marca Avança. Para mudar, edite `corTelao` em `assets/evento.js`.
