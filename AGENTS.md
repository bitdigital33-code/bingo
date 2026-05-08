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
- O backend suporta dois modos de persistencia:
  - `prisma` para persistencia real em PostgreSQL
  - `demo` para fallback em memoria
- A persistencia Prisma real ja esta conectada para:
  - tenants
  - usuarios e memberships
  - salas
  - partidas
  - rodadas de premio
  - sessoes de jogadores
  - cartelas e atribuicoes
  - eventos de sorteio
- Os modos `demo` e `prisma` devem continuar funcionando.
- O seed cria uma sala demo real:
  - codigo da sala: `NATAL26`
  - login admin: `admin@bingo.local`
  - senha: `bingo123`

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
```

Se o PostgreSQL estiver disponivel e configurado:

```bash
npm run prisma:push
npm run prisma:seed
npm run dev
```

Se o PostgreSQL ainda nao estiver disponivel:

```bash
npm run dev
```

Nesse caso, use:

- `BINGO_PERSISTENCE=demo`

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
- Mantenha o modo `demo` funcionando mesmo com a expansao do modo `prisma`.

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

## Estado Ja Verificado

O seguinte ja foi validado antes deste arquivo:

- `npm run build:contracts`
- `npm run build:api`
- `npm run build:web`
- `npm run prisma:generate`
- `npm run prisma:push`
- `npm run prisma:seed`
- `npm run test`
- `npm run test:e2e -w apps/api -- --runInBand`

O smoke test do Prisma tambem funcionou com:

- `persistenceMode=prisma`
- sala `NATAL26`
- `8` jogadores seedados

## Proximo Trabalho Recomendado

Implementar persistencia real para a trilha operacional que ainda falta no SaaS:

1. Persistir `win claims` no Prisma.
2. Persistir `audit logs` para acoes do admin, correcoes de sorteio, reversoes, pausas, retomadas e alteracoes de sala.
3. Persistir historico operacional das partidas para analytics e suporte futuros.
4. Expor esse historico com clareza nas APIs administrativas.

## Guardrails Para A Proxima IA

- Nao remova nem burle os testes existentes.
- Adicione ou atualize testes ao alterar regras do jogo ou persistencia.
- Nao troque Prisma por outro ORM.
- Nao reescreva a shell do frontend sem necessidade.
- Nao degrade a UI para um dashboard generico.
- Nao commit credenciais nem segredos especificos de maquina.

## Definicao De Boa Continuacao

Uma boa continuacao e aquela que:

- fortalece a persistencia real
- melhora a confiabilidade
- preserva a experiencia premium
- mantem o modo demo intacto
- entrega junto com testes
