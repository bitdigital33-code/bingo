# AGENTS.md

## Missao

Continuar o desenvolvimento do `Bingo Familiar Premium` como um SaaS multi-tenant premium para eventos reais de bingo em familia.

Este repositorio ja esta estruturado e funcional.
Nao recrie o projeto do zero.
Evolua o monorepo atual e preserve a arquitetura existente.

## Contexto Do Produto

- O globo de bingo e fisico e manual.
- O sistema funciona como painel digital, motor de validacao, experiencia do jogador e modo TV/telao.
- O painel admin tambem emite cartelas impressas com QR individual para abrir a mesma cartela digital no celular.
- Cartelas impressas possuem codigo seguro persistido e podem ser verificadas no painel admin antes de confirmar premios.
- O produto deve parecer premium, cinematografico, simples para familias e facil para idosos.
- O idioma principal e `pt-BR`.

## Estado Atual Do Repositorio

- Monorepo com:
  - `apps/api` -> `NestJS + Fastify + Socket.IO + Prisma + BullMQ + bridge Redis`
  - `apps/web` -> `React + Vite + Tailwind + Framer Motion`
  - `packages/contracts` -> DTOs e snapshots compartilhados
  - `packages/ui` -> design system compartilhado
- A API usa persistencia real com `Prisma + PostgreSQL`.
- O antigo modo demo em memoria foi removido.
- `DATABASE_URL` e obrigatorio para subir a API.
- O seed Prisma e vazio por padrao:
  - nao cria tenant
  - nao cria usuario admin
  - nao cria sala demo
  - nao cria jogadores nem sorteios
- O primeiro uso deve acontecer criando a organizacao inicial pela tela de login ou por `POST /api/v1/tenants`.
- Existe um script explicito para zerar banco local de desenvolvimento:
  - `npm run prisma:reset:empty`

## Persistencia Prisma Atual

A persistencia real esta conectada para:

- tenants
- usuarios e memberships
- salas
- partidas
- rodadas de premio
- sessoes de jogadores
- cartelas, cartelas impressas autenticadas e atribuicoes
- eventos de sorteio
- win claims
- audit logs
- historico administrativo da sala

## Recursos Atuais Importantes

- Painel admin:
  - cria, edita e exclui salas quando ha mais de uma sala
  - configura premios e remove rodadas nao concluidas
  - sorteia manualmente, corrige, reverte e faz replay do ultimo numero
  - controla apresentacoes do telao, premios em destaque, ultimos numeros e alertas de quase bingo
  - emite cartelas impressas com QR individual
  - verifica cartela por QR, codigo ou serial antes de validar uma mesa
- Modo TV/telao:
  - fica sincronizado por REST/WebSocket
  - mostra sorteio atual, premio destacado, momentos de palco e alertas acionados pelo admin
  - pode ser zerado/encerrado pelo admin para voltar para estado neutro
  - nao deve mostrar controles ou dados desnecessarios para o publico
- Jogador:
  - pode entrar pelo fluxo normal informando nome
  - pode usar cartela digital vinculada a sessao do jogador
  - tambem pode abrir uma cartela impressa pelo QR sem informar nome, com os mesmos numeros do papel
- Cartela impressa por QR:
  - `BingoCard.digitalAccessCode` e o segredo que autentica a cartela
  - `/card/:accessCode` abre a cartela digital no frontend
  - `/public/cards/:accessCode` retorna os dados publicos da cartela emitida
  - a marcacao na cartela impressa digital e local ao celular; a verdade antifraude continua no servidor/admin

## Primeira Regra

Antes de alterar qualquer coisa, inspecione a implementacao atual e continue a partir dela.
Prefira evoluir os modulos existentes em vez de substituir tudo.

## Arquivos Importantes

- `README.md`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/seed.ts`
- `apps/api/src/modules/bingo/application/bingo-facade.service.ts`
- `apps/api/src/modules/bingo/infrastructure/bingo-store.service.ts`
- `apps/api/src/modules/bingo/infrastructure/prisma-bingo-store.service.ts`
- `apps/api/src/modules/bingo/domain/bingo-engine.service.ts`
- `apps/web/src/pages/admin-dashboard-page.tsx`
- `apps/web/src/pages/join-room-page.tsx`
- `apps/web/src/pages/player-room-page.tsx`
- `apps/web/src/pages/printed-card-page.tsx`
- `apps/web/src/pages/tv-room-page.tsx`
- `apps/web/src/lib/manual-card.ts`
- `apps/web/src/lib/env.ts`

## Setup Em Uma Nova Maquina

Execute na raiz do repositorio:

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

Para iniciar completamente zerado em desenvolvimento local:

```bash
npm run prisma:reset:empty
npm run dev
```

## Observacoes De Ambiente

- Copie `.env.example` para um `.env` local quando necessario.
- Nunca commit segredos.
- `apps/api/.env` e `apps/web/.env` podem existir localmente em algumas maquinas, mas devem ser tratados como configuracao local apenas.
- Redis e opcional no desenvolvimento local, mas deve continuar suportado.
- Para QR de cartela e links publicos em rede local, prefira abrir/imprimir o painel pelo IP da maquina, por exemplo `http://192.168.x.x:5173/app`.
- `WEB_BASE_URL` pode ser usado para gerar links publicos pelo backend; no print do admin, o QR usa a origem real do navegador quando possivel.

## Regras Tecnicas Nao Negociaveis

- Preserve a estrutura de monorepo.
- Preserve a separacao em estilo DDD dentro da API:
  - `domain`
  - `application`
  - `infrastructure`
  - `presentation`
- Mantenha as decisoes anti-fraude no servidor.
- Mantenha a deteccao de vencedores no servidor.
- Nao mova a verdade do jogo para o frontend.
- Nao trate marcacao local da cartela impressa por QR como prova de premio; ela e conveniencia visual.
- A verificacao de autenticidade da cartela impressa deve continuar passando pelo backend e pelo tenant/sala corretos.
- Mantenha as atualizacoes de WebSocket alinhadas com snapshots REST.
- Nao reintroduza fallback demo em memoria.
- Nao troque Prisma por outro ORM.

## Regras De Produto Nao Negociaveis

- Preserve a direcao visual premium.
- Preserve a UX amigavel para idosos e familias.
- Preserve botoes grandes, tipografia legivel e suporte a alto contraste.
- Preserve o modo TV otimizado para projetor e Smart TV.
- Preserve a camada social divertida:
  - alertas de quase bingo
  - mensagens de hype
  - anuncios
  - estados de comemoracao

## Guardrails Para A Proxima IA

- Nao remova nem burle os testes existentes.
- Adicione ou atualize testes ao alterar regras do jogo ou persistencia.
- Nao reescreva a shell do frontend sem necessidade.
- Nao degrade a UI para um dashboard generico.
- Nao commit credenciais nem segredos especificos de maquina.
- Nao rode `npm run prisma:reset:empty` em ambiente que nao seja local/dev.

## Definicao De Boa Continuacao

Uma boa continuacao e aquela que:

- fortalece a persistencia real
- melhora a confiabilidade
- preserva a experiencia premium
- mantem a base limpa para primeiro uso real
- entrega junto com testes
