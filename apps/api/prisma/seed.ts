import { hashSync } from 'bcryptjs';
import { Prisma, PrismaClient, type PrizePattern as PrismaPrizePattern } from '@prisma/client';
import type { BingoLetter } from '@bingo/contracts';
import { BingoCardFactory } from '../src/modules/bingo/domain/bingo-card.factory';
import { buildDrawDisplay } from '../src/modules/bingo/domain/bingo-rules';

const prisma = new PrismaClient();
const cardFactory = new BingoCardFactory();

const demoPlayers = [
  { name: 'Joao', avatar: 'JS', cardsRequested: 1 },
  { name: 'Maria', avatar: 'MA', cardsRequested: 2 },
  { name: 'Paulo', avatar: 'PA', cardsRequested: 1 },
  { name: 'Lia', avatar: 'LI', cardsRequested: 1 },
  { name: 'Carla', avatar: 'CA', cardsRequested: 1 },
  { name: 'Rafa', avatar: 'RA', cardsRequested: 1 },
  { name: 'Tati', avatar: 'TA', cardsRequested: 1 },
  { name: 'Beto', avatar: 'BE', cardsRequested: 1 },
] as const;

type SeededPlayer = {
  id: string;
  name: string;
  avatar: string;
  cards: Array<{
    id: string;
    serial: string;
    cells: Array<Array<{ letter: BingoLetter; value: number | 'FREE'; row: number; col: number }>>;
  }>;
};

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: {
      slug: 'bingo-familiar-premium',
    },
    update: {
      name: 'Bingo Familiar Premium',
    },
    create: {
      name: 'Bingo Familiar Premium',
      slug: 'bingo-familiar-premium',
    },
  });

  const owner = await prisma.user.upsert({
    where: {
      email: 'admin@bingo.local',
    },
    update: {
      name: 'Ana Mestre de Cerimonia',
      passwordHash: hashSync('bingo123', 10),
    },
    create: {
      name: 'Ana Mestre de Cerimonia',
      email: 'admin@bingo.local',
      passwordHash: hashSync('bingo123', 10),
    },
  });

  const operator = await prisma.user.upsert({
    where: {
      email: 'operador@bingo.local',
    },
    update: {
      name: 'Operador Telao',
      passwordHash: hashSync('bingo123', 10),
    },
    create: {
      name: 'Operador Telao',
      email: 'operador@bingo.local',
      passwordHash: hashSync('bingo123', 10),
    },
  });

  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: owner.id,
      },
    },
    update: {
      role: 'owner',
    },
    create: {
      tenantId: tenant.id,
      userId: owner.id,
      role: 'owner',
    },
  });

  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: operator.id,
      },
    },
    update: {
      role: 'operator',
    },
    create: {
      tenantId: tenant.id,
      userId: operator.id,
      role: 'operator',
    },
  });

  await prisma.themePreset.createMany({
    data: [
      {
        tenantId: tenant.id,
        key: 'cassino',
        label: 'Cassino',
        accent: '#ff7a59',
        ambient: '#07131d',
      },
      {
        tenantId: tenant.id,
        key: 'natal',
        label: 'Natal',
        accent: '#f05454',
        ambient: '#0a2018',
      },
      {
        tenantId: tenant.id,
        key: 'neon',
        label: 'Neon',
        accent: '#4bf6ff',
        ambient: '#050816',
      },
      {
        tenantId: tenant.id,
        key: 'junina',
        label: 'Festa Junina',
        accent: '#ffb449',
        ambient: '#1a1021',
      },
      {
        tenantId: tenant.id,
        key: 'infantil',
        label: 'Infantil',
        accent: '#ff6fa3',
        ambient: '#13213d',
      },
    ],
    skipDuplicates: true,
  });

  const room = await prisma.room.upsert({
    where: {
      joinCode: 'NATAL26',
    },
    update: {
      tenantId: tenant.id,
      name: 'Natal em Familia 2026',
      theme: 'natal',
      allowAutoMark: true,
      allowManualMark: true,
      maxCardsPerPlayer: 3,
    },
    create: {
      tenantId: tenant.id,
      name: 'Natal em Familia 2026',
      joinCode: 'NATAL26',
      theme: 'natal',
      allowAutoMark: true,
      allowManualMark: true,
      maxCardsPerPlayer: 3,
    },
  });

  const match = await ensureLiveMatch(room.id);
  const seededPlayers = await ensureDemoPlayers(room.id, match.id);
  await ensureCuratedDraws(match.id, owner.id, seededPlayers);

  console.log(
    `Seed pronta para tenant ${tenant.name}, room ${room.name}, match ${match.id}, players ${seededPlayers.length}`,
  );
}

async function ensureLiveMatch(roomId: string) {
  let match = await prisma.match.findFirst({
    where: {
      roomId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      prizeRounds: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  if (!match) {
    match = await prisma.match.create({
      data: {
        roomId,
        status: 'live',
        startedAt: new Date(),
      },
      include: {
        prizeRounds: true,
      },
    });
  } else if (match.status !== 'live') {
    match = await prisma.match.update({
      where: {
        id: match.id,
      },
      data: {
        status: 'live',
        startedAt: match.startedAt ?? new Date(),
        pausedAt: null,
        endedAt: null,
      },
      include: {
        prizeRounds: true,
      },
    });
  }

  if (match.prizeRounds.length === 0) {
    await prisma.prizeRound.createMany({
      data: defaultPrizeRounds(match.id),
      skipDuplicates: true,
    });
  }

  return prisma.match.findUniqueOrThrow({
    where: {
      id: match.id,
    },
    include: {
      prizeRounds: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  });
}

async function ensureDemoPlayers(roomId: string, matchId: string) {
  const existingSerials = new Set(
    (
      await prisma.bingoCard.findMany({
        select: {
          serial: true,
        },
      })
    ).map((entry) => entry.serial),
  );

  const seededPlayers: SeededPlayer[] = [];

  for (const entry of demoPlayers) {
    let session = await prisma.playerSession.findFirst({
      where: {
        roomId,
        name: entry.name,
      },
      include: {
        assignments: {
          where: {
            matchId,
          },
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            bingoCard: true,
          },
        },
      },
    });

    if (!session) {
      session = await prisma.playerSession.create({
        data: {
          roomId,
          name: entry.name,
          avatar: entry.avatar,
          token: buildSeedToken(roomId, entry.name),
          autoMark: true,
        },
        include: {
          assignments: {
            where: {
              matchId,
            },
            include: {
              bingoCard: true,
            },
          },
        },
      });
    }

    const cardsMissing = Math.max(entry.cardsRequested - session.assignments.length, 0);
    if (cardsMissing > 0) {
      const newCards = cardFactory.generateCards(cardsMissing, existingSerials);

      for (const card of newCards) {
        const bingoCard = await prisma.bingoCard.create({
          data: {
            serial: card.serial,
            matrixJson: card.cells as unknown as Prisma.InputJsonValue,
          },
        });

        await prisma.cardAssignment.create({
          data: {
            matchId,
            playerSessionId: session.id,
            bingoCardId: bingoCard.id,
          },
        });
      }
    }

    const refreshed = await prisma.playerSession.findUniqueOrThrow({
      where: {
        id: session.id,
      },
      include: {
        assignments: {
          where: {
            matchId,
          },
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            bingoCard: true,
          },
        },
      },
    });

    seededPlayers.push({
      id: refreshed.id,
      name: refreshed.name,
      avatar: refreshed.avatar,
      cards: refreshed.assignments.map((assignment) => ({
        id: assignment.bingoCard.id,
        serial: assignment.bingoCard.serial,
        cells: assignment.bingoCard.matrixJson as SeededPlayer['cards'][number]['cells'],
      })),
    });
  }

  return seededPlayers;
}

async function ensureCuratedDraws(matchId: string, ownerId: string, players: SeededPlayer[]) {
  const drawCount = await prisma.drawEvent.count({
    where: {
      matchId,
    },
  });

  if (drawCount > 0) {
    return;
  }

  const draws = buildCuratedDemoDraws(players);
  let sequence = 1;

  for (const [letter, value] of draws) {
    await prisma.drawEvent.create({
      data: {
        matchId,
        letter,
        value,
        display: buildDrawDisplay(letter, value),
        type: 'draw',
        sequence,
        actorUserId: ownerId,
      },
    });
    sequence += 1;
  }
}

function defaultPrizeRounds(matchId: string): Prisma.PrizeRoundCreateManyInput[] {
  return [
    {
      matchId,
      label: '1 Linha',
      pattern: 'single_line' as PrismaPrizePattern,
      order: 1,
      prize: 'Caixa surpresa premium',
    },
    {
      matchId,
      label: '2 Linhas',
      pattern: 'double_line' as PrismaPrizePattern,
      order: 2,
      prize: 'Cesta comemorativa',
    },
    {
      matchId,
      label: 'Cartela Cheia',
      pattern: 'full_house' as PrismaPrizePattern,
      order: 3,
      prize: 'Super premio da noite',
    },
  ];
}

function buildSeedToken(roomId: string, playerName: string) {
  return `seed_${roomId.slice(-6)}_${slugify(playerName)}`;
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildCuratedDemoDraws(players: SeededPlayer[]) {
  const chosen: Array<[BingoLetter, number]> = [];
  const seen = new Set<string>();

  const pushValue = (letter: BingoLetter, value: number | 'FREE') => {
    if (value === 'FREE') {
      return;
    }

    const key = `${letter}${value}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    chosen.push([letter, value]);
  };

  const firstCard = players[0]?.cards[0];
  const secondCard = players[1]?.cards[0];

  firstCard?.cells[0]?.slice(0, 4).forEach((cell) => pushValue(cell.letter, cell.value));
  firstCard?.cells[1]?.slice(0, 3).forEach((cell) => pushValue(cell.letter, cell.value));
  secondCard?.cells[3]?.slice(0, 4).forEach((cell) => pushValue(cell.letter, cell.value));

  pushValue('G', 52);
  pushValue('O', 70);

  return chosen.slice(0, 12);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
