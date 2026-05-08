import type { PrizeRoundConfig } from '@bingo/contracts';
import { BingoEngineService } from './bingo-engine.service';
import type {
  StoredMatch,
  StoredPlayerSession,
  StoredRoom,
  StoredTenant,
} from './internal-types';

describe('BingoEngineService', () => {
  const engine = new BingoEngineService();

  it('detecta vencedores e proximidade com base nos draws ativos', () => {
    const tenant: StoredTenant = {
      id: 'tenant-1',
      name: 'Tenant',
      slug: 'tenant',
      createdAt: new Date().toISOString(),
    };

    const room: StoredRoom = {
      id: 'room-1',
      tenantId: tenant.id,
      name: 'Sala Premium',
      joinCode: 'ROOM01',
      theme: 'cassino',
      allowAutoMark: true,
      allowManualMark: true,
      maxCardsPerPlayer: 3,
      createdAt: new Date().toISOString(),
      matchId: 'match-1',
    };

    const rounds: PrizeRoundConfig[] = [
      {
        id: 'round-1',
        label: '1 Linha',
        pattern: 'single_line',
        order: 1,
        prize: 'Teste',
      },
    ];

    const player: StoredPlayerSession = {
      id: 'player-1',
      roomId: room.id,
      name: 'Maria',
      avatar: '✨',
      token: 'token',
      autoMark: true,
      createdAt: new Date().toISOString(),
      cards: [
        {
          id: 'card-1',
          serial: 'CARD-01',
          cells: [
            [
              { letter: 'B', value: 1, row: 0, col: 0 },
              { letter: 'I', value: 16, row: 0, col: 1 },
              { letter: 'N', value: 31, row: 0, col: 2 },
              { letter: 'G', value: 46, row: 0, col: 3 },
              { letter: 'O', value: 61, row: 0, col: 4 },
            ],
            [
              { letter: 'B', value: 2, row: 1, col: 0 },
              { letter: 'I', value: 17, row: 1, col: 1 },
              { letter: 'N', value: 32, row: 1, col: 2 },
              { letter: 'G', value: 47, row: 1, col: 3 },
              { letter: 'O', value: 62, row: 1, col: 4 },
            ],
            [
              { letter: 'B', value: 3, row: 2, col: 0 },
              { letter: 'I', value: 18, row: 2, col: 1 },
              { letter: 'N', value: 'FREE', row: 2, col: 2 },
              { letter: 'G', value: 48, row: 2, col: 3 },
              { letter: 'O', value: 63, row: 2, col: 4 },
            ],
            [
              { letter: 'B', value: 4, row: 3, col: 0 },
              { letter: 'I', value: 19, row: 3, col: 1 },
              { letter: 'N', value: 33, row: 3, col: 2 },
              { letter: 'G', value: 49, row: 3, col: 3 },
              { letter: 'O', value: 64, row: 3, col: 4 },
            ],
            [
              { letter: 'B', value: 5, row: 4, col: 0 },
              { letter: 'I', value: 20, row: 4, col: 1 },
              { letter: 'N', value: 34, row: 4, col: 2 },
              { letter: 'G', value: 50, row: 4, col: 3 },
              { letter: 'O', value: 65, row: 4, col: 4 },
            ],
          ],
        },
      ],
    };

    const match: StoredMatch = {
      id: 'match-1',
      roomId: room.id,
      status: 'live',
      startedAt: new Date().toISOString(),
      prizeRounds: rounds,
      drawEvents: [
        {
          id: 'draw-1',
          matchId: 'match-1',
          letter: 'B',
          value: 1,
          display: 'B1',
          type: 'draw',
          sequence: 1,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'draw-2',
          matchId: 'match-1',
          letter: 'I',
          value: 16,
          display: 'I16',
          type: 'draw',
          sequence: 2,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'draw-3',
          matchId: 'match-1',
          letter: 'N',
          value: 31,
          display: 'N31',
          type: 'draw',
          sequence: 3,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'draw-4',
          matchId: 'match-1',
          letter: 'G',
          value: 46,
          display: 'G46',
          type: 'draw',
          sequence: 4,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'draw-5',
          matchId: 'match-1',
          letter: 'O',
          value: 61,
          display: 'O61',
          type: 'draw',
          sequence: 5,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const snapshot = engine.buildRoomSnapshot({
      room,
      match,
      tenant,
      players: [player],
      webBaseUrl: 'http://localhost:5173',
    });

    expect(snapshot.match.lastWinner?.winners[0]?.playerName).toBe('Maria');
    expect(snapshot.match.prizeRounds[0]?.completedAt).toBeDefined();
    expect(snapshot.match.currentDraw?.display).toBe('O61');
  });
});
