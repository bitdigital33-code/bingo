import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from './../src/app.module';

const ranges = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
} as const;

jest.setTimeout(30_000);

describe('Bingo API (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.BINGO_PERSISTENCE = 'prisma';
    process.env.REDIS_URL = '';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.enableCors();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('faz login, carrega bootstrap e registra sorteio', async () => {
    const unique = Date.now().toString(36);
    const ownerEmail = `owner-${unique}@bingo.test`;
    const password = 'bingo123';

    await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({
        tenantName: `Familia Teste ${unique}`,
        slug: `familia-teste-${unique}`,
        ownerName: 'Ana Teste',
        ownerEmail,
        password,
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: ownerEmail,
        password,
      })
      .expect(201);

    const token = login.body.accessToken as string;
    expect(token).toBeDefined();

    const bootstrap = await request(app.getHttpServer())
      .get('/api/v1/auth/bootstrap')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const room = bootstrap.body.rooms[0];
    expect(room.roomCode).toBeDefined();

    const extraRoom = await request(app.getHttpServer())
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Sala para excluir',
        theme: 'cassino',
        maxCardsPerPlayer: 3,
        allowAutoMark: true,
        allowManualMark: true,
      })
      .expect(201);

    const deletedRoom = await request(app.getHttpServer())
      .delete(`/api/v1/rooms/${extraRoom.body.room.roomId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      deletedRoom.body.rooms.some(
        (entry: { roomId: string }) =>
          entry.roomId === extraRoom.body.room.roomId,
      ),
    ).toBe(false);

    const started = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${room.roomId}/start-match`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(started.body.room.match.status).toBe('live');

    const firstPrize = started.body.room.match.prizeRounds[0];
    const configuredPrize = await request(app.getHttpServer())
      .patch(`/api/v1/rooms/${room.roomId}/prize-rounds`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        rounds: [
          {
            id: firstPrize.id,
            label: 'Premio relampago',
            pattern: 'marked_count',
            targetMarks: 3,
            prize: 'Vale presente surpresa',
          },
          {
            label: 'Rodada surpresa relampago',
            pattern: 'marked_count',
            targetMarks: 5,
            prize: 'Combo especial da familia',
          },
        ],
      })
      .expect(200);

    expect(configuredPrize.body.room.match.prizeRounds[0].targetMarks).toBe(3);
    expect(
      configuredPrize.body.room.match.prizeRounds.some(
        (entry: { label: string; targetMarks?: number }) =>
          entry.label === 'Rodada surpresa relampago' &&
          entry.targetMarks === 5,
      ),
    ).toBe(true);

    const removedPrize = await request(app.getHttpServer())
      .patch(`/api/v1/rooms/${room.roomId}/prize-rounds`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        rounds: [
          {
            id: firstPrize.id,
            label: 'Premio relampago',
            pattern: 'marked_count',
            targetMarks: 3,
            prize: 'Vale presente surpresa',
          },
        ],
      })
      .expect(200);

    expect(
      removedPrize.body.room.match.prizeRounds.some(
        (entry: { label: string }) =>
          entry.label === 'Rodada surpresa relampago',
      ),
    ).toBe(false);

    const showcasedPrize = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${room.roomId}/prize-showcase`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        roundId: firstPrize.id,
        visible: true,
      })
      .expect(201);

    expect(showcasedPrize.body.room.match.prizeShowcase.roundId).toBe(
      firstPrize.id,
    );

    const stageMoment = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${room.roomId}/stage-moment`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        visible: true,
        key: 'attention',
        title: 'Atenção no salão',
        message: 'Confiram as cartelas porque vem numero forte.',
      })
      .expect(201);

    expect(stageMoment.body.room.match.stageMoment.title).toBe(
      'Atenção no salão',
    );

    const drawnNumbers = new Set<string>(
      showcasedPrize.body.room.match.drawnNumbers.map(
        (entry: { display: string }) => entry.display,
      ),
    );

    const nextDraw = (
      Object.entries(ranges) as Array<
        [keyof typeof ranges, readonly [number, number]]
      >
    )
      .flatMap(([letter, [min, max]]) =>
        Array.from({ length: max - min + 1 }, (_, index) => ({
          letter,
          value: min + index,
          display: `${letter}${min + index}`,
        })),
      )
      .find((entry) => !drawnNumbers.has(entry.display));

    expect(nextDraw).toBeDefined();

    const draw = await request(app.getHttpServer())
      .post(`/api/v1/matches/${started.body.room.match.matchId}/draws`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        letter: nextDraw!.letter,
        value: nextDraw!.value,
      })
      .expect(201);

    expect(draw.body.room.match.currentDraw.display).toBe(nextDraw!.display);

    const nearWinAlert = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${room.roomId}/stage-moment`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        visible: true,
        key: 'near_win',
        title: '1 cartela na boa',
        message: 'Falta 1 numero para sair bingo. Todo mundo de olho!',
        durationSeconds: 8,
      })
      .expect(201);

    expect(nearWinAlert.body.room.match.stageMoment.key).toBe('near_win');
    expect(nearWinAlert.body.room.match.stageMoment.expiresAt).toBeDefined();

    const recentDrawsShowcase = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${room.roomId}/tv/recent-draws`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        visible: true,
      })
      .expect(201);

    expect(recentDrawsShowcase.body.room.match.recentDrawsVisible).toBe(true);
    expect(recentDrawsShowcase.body.room.match.stageMoment).toBeUndefined();

    const firstHistory = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${room.roomId}/history`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      firstHistory.body.auditLogs.some(
        (entry: { action: string; matchId: string }) =>
          entry.action === 'draw.created' &&
          entry.matchId === started.body.room.match.matchId,
      ),
    ).toBe(true);

    const printBatch = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${room.roomId}/print-cards`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        quantity: 4,
        title: 'Cartelas de Teste',
        cardsPerPage: 4,
      })
      .expect(201);

    expect(printBatch.body.cards).toHaveLength(4);
    expect(
      new Set(
        printBatch.body.cards.map((card: { serial: string }) => card.serial),
      ).size,
    ).toBe(4);
    expect(printBatch.body.cards[0].digitalAccessCode).toBeDefined();
    expect(printBatch.body.cards[0].qrValue).toContain(
      `/card/${printBatch.body.cards[0].digitalAccessCode}`,
    );

    const printedCard = await request(app.getHttpServer())
      .get(`/public/cards/${printBatch.body.cards[0].digitalAccessCode}`)
      .expect(200);

    expect(printedCard.body.roomCode).toBe(room.roomCode);
    expect(printedCard.body.card.serial).toBe(printBatch.body.cards[0].serial);
    expect(printedCard.body.card.cells).toEqual(printBatch.body.cards[0].cells);

    const verifiedCard = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${room.roomId}/print-cards/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: printBatch.body.cards[0].qrValue,
      })
      .expect(201);

    expect(verifiedCard.body.authentic).toBe(true);
    expect(verifiedCard.body.card.serial).toBe(printBatch.body.cards[0].serial);

    const rejectedCard = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${room.roomId}/print-cards/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'BFP-INVALIDA',
      })
      .expect(201);

    expect(rejectedCard.body.authentic).toBe(false);

    const joined = await request(app.getHttpServer())
      .post(`/public/rooms/${room.roomCode}/join`)
      .send({
        name: 'Visitante Auditoria',
        cardsRequested: 1,
      })
      .expect(201);

    const updatedPlayer = await request(app.getHttpServer())
      .patch(`/api/v1/rooms/${room.roomId}/players/${joined.body.player.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Visitante Conferido',
        autoMark: false,
      })
      .expect(200);

    const playerAfterUpdate = updatedPlayer.body.room.match.players.find(
      (entry: { id: string }) => entry.id === joined.body.player.id,
    );
    expect(playerAfterUpdate.name).toBe('Visitante Conferido');
    expect(
      playerAfterUpdate.cards.every(
        (card: { autoMark: boolean }) => !card.autoMark,
      ),
    ).toBe(true);

    const claim = await request(app.getHttpServer())
      .post(`/api/v1/matches/${started.body.room.match.matchId}/claims`)
      .send({
        playerToken: joined.body.playerToken,
      })
      .expect(201);

    expect(claim.body.claim.status).toMatch(/confirmed|rejected/);

    const removedPlayer = await request(app.getHttpServer())
      .delete(`/api/v1/rooms/${room.roomId}/players/${joined.body.player.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      removedPlayer.body.room.match.players.some(
        (entry: { id: string }) => entry.id === joined.body.player.id,
      ),
    ).toBe(false);

    const resetTv = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${room.roomId}/tv/reset`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(resetTv.body.room.match.prizeShowcase).toBeUndefined();
    expect(resetTv.body.room.match.stageMoment).toBeUndefined();
    expect(resetTv.body.room.match.recentDrawsVisible).toBe(false);
    expect(resetTv.body.room.match.tvStandby).toBe(true);

    const endedMatch = await request(app.getHttpServer())
      .post(`/api/v1/matches/${started.body.room.match.matchId}/end`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(endedMatch.body.room.match.status).toBe('completed');
    expect(endedMatch.body.room.match.endedAt).toBeDefined();
    expect(endedMatch.body.room.match.prizeShowcase).toBeUndefined();
    expect(endedMatch.body.room.match.stageMoment).toBeUndefined();
    expect(endedMatch.body.room.match.recentDrawsVisible).toBe(false);
    expect(endedMatch.body.room.match.tvStandby).toBe(true);

    const history = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${room.roomId}/history`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(history.body.winClaims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: claim.body.claim.id,
          matchId: started.body.room.match.matchId,
        }),
      ]),
    );
    expect(
      history.body.items.some(
        (entry: { type: string }) => entry.type === 'win_claim',
      ),
    ).toBe(true);
    expect(
      history.body.auditLogs.some(
        (entry: { action: string }) => entry.action === 'player.updated',
      ),
    ).toBe(true);
    expect(
      history.body.auditLogs.some(
        (entry: { action: string }) => entry.action === 'player.removed',
      ),
    ).toBe(true);
    expect(
      history.body.auditLogs.some(
        (entry: { action: string }) => entry.action === 'print_cards.generated',
      ),
    ).toBe(true);
    expect(
      history.body.auditLogs.some(
        (entry: { action: string }) => entry.action === 'prize_rounds.updated',
      ),
    ).toBe(true);
    expect(
      history.body.auditLogs.some(
        (entry: { action: string }) =>
          entry.action === 'prize.showcase.presented',
      ),
    ).toBe(true);
    expect(
      history.body.auditLogs.some(
        (entry: { action: string }) =>
          entry.action === 'stage.moment.presented',
      ),
    ).toBe(true);
    expect(
      history.body.auditLogs.some(
        (entry: { action: string }) => entry.action === 'tv.presentation.reset',
      ),
    ).toBe(true);
    expect(
      history.body.auditLogs.some(
        (entry: { action: string }) =>
          entry.action === 'tv.recent_draws.presented',
      ),
    ).toBe(true);
    expect(
      history.body.auditLogs.some(
        (entry: { action: string }) => entry.action === 'match.completed',
      ),
    ).toBe(true);
  });
});
