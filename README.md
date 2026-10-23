# GS RISE — Barbearia

Site de agendamento feito em **HTML, CSS e JavaScript puro**, sem frameworks ou dependências.

## Abrir

Abra `index.html` no navegador ou execute `npm start` (requer Node.js) e acesse **http://localhost:3000**. O servidor JavaScript serve apenas os arquivos estáticos.

## Funcionalidades

- Três barbeiros com nome, foto e especialidade.
- Quatro serviços com preço e duração.
- Data e horário, de segunda a sábado, das 9h às 19h.
- Bloqueio local de horários passados e reservas sobrepostas do mesmo profissional.
- Validação de nome, celular com DDD e e-mail opcional.
- Resumo, consulta, cancelamento e exportação para o calendário (.ics).
- Layout responsivo, teclado e suporte à redução de movimento.

## Armazenamento

Demonstração de frontend: reservas e dados pessoais ficam no `localStorage` deste navegador. Não há envio à barbearia, banco compartilhado ou notificações. Limpar os dados do navegador remove as reservas. A disponibilidade não sincroniza entre dispositivos. Para uso real, integre uma API e banco de dados com controle de disponibilidade no servidor.

Identidade visual baseada em https://gsstudio-eight.vercel.app/: logotipo oficial, fonte Manrope e cores preto, branco e verde-claro. Nomes dos barbeiros, avaliações, experiência e preços são ilustrativos. Fotos: Unsplash, salvas em `assets`. Fontes Manrope e Libre Caslon Display também salvas localmente, com licenças na pasta `assets`. O site funciona sem buscar recursos externos.

## Arquivos

- `index.html`: estrutura e diálogos.
- `style.css`: visual, animações e responsividade.
- `app.js`: agendamento e armazenamento local.
- `server.js`: servidor local opcional em JavaScript, sem dependências.

Verificação de sintaxe: `npm run check`.
