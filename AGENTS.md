# AGENTS.md

## Missao

Continuar o desenvolvimento do `Bingo Familiar Premium` como um SaaS multi-tenant premium para eventos reais de bingo em familia.

Este repositorio ja esta estruturado e funcional.
Nao recrie o projeto do zero.
Evolua o monorepo atual e preserve a arquitetura existente.

## Contexto Do Produto

- O globo de bingo e fisico e manual.
- O sistema funciona como painel digital, motor de validacao, experiencia do jogador e modo TV/telao.
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
- cartelas e atribuicoes
- eventos de sorteio
- win claims
- audit logs
- historico administrativo da sala

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
- `apps/web/src/pages/tv-room-page.tsx`

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
