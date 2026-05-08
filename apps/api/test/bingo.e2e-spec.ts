import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from './../src/app.module';

const ranges = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
} as const;

describe('Bingo API (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.BINGO_PERSISTENCE = 'demo';
    process.env.REDIS_URL = '';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.enableCors();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('faz login, carrega bootstrap e registra sorteio', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@bingo.local',
        password: 'bingo123',
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
    const drawnNumbers = new Set<string>(
      room.match.drawnNumbers.map((entry: { display: string }) => entry.display),
    );

    const nextDraw = (Object.entries(ranges) as Array<[keyof typeof ranges, readonly [number, number]]>)
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
      .post(`/api/v1/matches/${room.match.matchId}/draws`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        letter: nextDraw!.letter,
        value: nextDraw!.value,
      })
      .expect(201);

    expect(draw.body.room.match.currentDraw.display).toBe(nextDraw!.display);
  });
});
