import { Injectable, Logger } from '@nestjs/common';
import { hashSync } from 'bcryptjs';
import {
  Prisma,
  type MatchStatus as PrismaMatchStatus,
  type DrawEventType as PrismaDrawEventType,
  type PrizePattern as PrismaPrizePattern,
} from '@prisma/client';
import type {
  BingoLetter,
  CreateRoomRequest,
  CreateTenantRequest,
  DrawEntryCommand,
  MatchStatus,
  PrizeRoundConfig,
} from '@bingo/contracts';
import { BingoCardFactory } from '../domain/bingo-card.factory';
import { createId } from '../domain/create-id';
import { buildDrawDisplay } from '../domain/bingo-rules';
import type {
  InvitePayload,
  StoredCard,
  StoredDrawEvent,
  StoredMatch,
  StoredPlayerSession,
  StoredRoom,
  StoredTenant,
  StoredUser,
} from '../domain/internal-types';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaBingoStoreService {
  private readonly logger = new Logger(PrismaBingoStoreService.name);
  private connectionAttempted = false;
  private connected = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cardFactory: BingoCardFactory,
  ) {}

  async isAvailable() {
    if (!process.env.DATABASE_URL) {
      return false;
    }

    if (this.connected) {
      return true;
    }

    if (this.connectionAttempted && !this.connected) {
      return false;
    }

    this.connectionAttempted = true;

    try {
      await this.prisma.$connect();
      this.connected = true;
      return true;
    } catch (error) {
      this.logger.warn(`Prisma indisponivel, mantendo fallback demo: ${String(error)}`);
      return false;
    }
  }

  async getUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
      include: {
        memberships: {
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
        },
      },
    });

    return user ? this.toStoredUser(user) : undefined;
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        memberships: {
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
        },
      },
    });

    return user ? this.toStoredUser(user) : undefined;
  }

  async getTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
    });

    return tenant ? this.toStoredTenant(tenant) : undefined;
  }

  async getRoom(roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: {
        id: roomId,
      },
    });

    return room ? this.toStoredRoom(room) : undefined;
  }

  async getRoomByCode(joinCode: string) {
    const room = await this.prisma.room.findUnique({
      where: {
        joinCode: joinCode.trim().toUpperCase(),
      },
    });

    return room ? this.toStoredRoom(room) : undefined;
  }

  async getRoomsForTenant(tenantId: string) {
    const rooms = await this.prisma.room.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return Promise.all(rooms.map((room) => this.toStoredRoom(room)));
  }

  async getMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: {
        id: matchId,
      },
      include: {
        prizeRounds: {
          orderBy: {
            order: 'asc',
          },
        },
        drawEvents: {
          orderBy: {
            sequence: 'asc',
          },
        },
      },
    });

    return match ? this.toStoredMatch(match) : undefined;
  }

  async getPlayersForRoom(roomId: string) {
    const currentMatch = await this.findCurrentMatch(roomId);
    if (!currentMatch) {
      return [];
    }

    const sessions = await this.prisma.playerSession.findMany({
      where: {
        roomId,
        assignments: {
          some: {
            matchId: currentMatch.id,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        assignments: {
          where: {
            matchId: currentMatch.id,
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

    return sessions.map((session) => this.toStoredPlayerSession(session));
  }

  async getPlayerByToken(token: string) {
    const session = await this.prisma.playerSession.findUnique({
      where: {
        token,
      },
      include: {
        assignments: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            bingoCard: true,
          },
        },
      },
    });

    return session ? this.toStoredPlayerSession(session) : undefined;
  }

  async createTenant(payload: CreateTenantRequest) {
    const created = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: payload.tenantName,
          slug: payload.slug,
        },
      });

      const owner = await tx.user.create({
        data: {
          name: payload.ownerName,
          email: payload.ownerEmail.trim().toLowerCase(),
          passwordHash: hashSync(payload.password, 10),
        },
      });

      await tx.membership.create({
        data: {
          tenantId: tenant.id,
          userId: owner.id,
          role: 'owner',
        },
      });

      const room = await tx.room.create({
        data: {
          tenantId: tenant.id,
          name: 'Sala Principal',
          joinCode: await this.generateUniqueJoinCode(tx),
          theme: 'cassino',
          allowAutoMark: true,
          allowManualMark: true,
          maxCardsPerPlayer: 3,
        },
      });

      const match = await tx.match.create({
        data: {
          roomId: room.id,
          status: 'draft',
        },
      });

      await tx.prizeRound.createMany({
        data: this.createDefaultPrizeRounds(match.id),
      });

      return { tenant, owner, room, matchId: match.id };
    });

    return {
      tenant: this.toStoredTenant(created.tenant),
      owner: (await this.getUserById(created.owner.id))!,
      room: this.toStoredRoomInline(created.room, created.matchId),
    };
  }

  async inviteMember(tenantId: string, payload: InvitePayload) {
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: payload.name,
          email: payload.email.trim().toLowerCase(),
          passwordHash: hashSync(payload.password ?? 'bingo123', 10),
        },
      });

      await tx.membership.create({
        data: {
          tenantId,
          userId: user.id,
          role: payload.role,
        },
      });

      return user.id;
    });

    return (await this.getUserById(created))!;
  }

  async createRoom(tenantId: string, payload: CreateRoomRequest) {
    const created = await this.prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          tenantId,
          name: payload.name,
          joinCode: await this.generateUniqueJoinCode(tx),
          theme: payload.theme,
          allowAutoMark: payload.allowAutoMark,
          allowManualMark: payload.allowManualMark,
          maxCardsPerPlayer: payload.maxCardsPerPlayer,
        },
      });

      const match = await tx.match.create({
        data: {
          roomId: room.id,
          status: 'draft',
        },
      });

      await tx.prizeRound.createMany({
        data: this.createDefaultPrizeRounds(match.id),
      });

      return { room, matchId: match.id };
    });

    return this.toStoredRoomInline(created.room, created.matchId);
  }

  async updateRoom(roomId: string, patch: Partial<CreateRoomRequest>) {
    const room = await this.prisma.room.update({
      where: {
        id: roomId,
      },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
        ...(patch.maxCardsPerPlayer !== undefined
          ? { maxCardsPerPlayer: patch.maxCardsPerPlayer }
          : {}),
        ...(patch.allowAutoMark !== undefined ? { allowAutoMark: patch.allowAutoMark } : {}),
        ...(patch.allowManualMark !== undefined
          ? { allowManualMark: patch.allowManualMark }
          : {}),
      },
    });

    return this.toStoredRoom(room);
  }

  async updateMatchStatus(matchId: string, status: MatchStatus) {
    const current = await this.prisma.match.findUnique({
      where: {
        id: matchId,
      },
    });

    if (!current) {
      return undefined;
    }

    await this.prisma.match.update({
      where: {
        id: matchId,
      },
      data: {
        status: status as PrismaMatchStatus,
        ...(status === 'live'
          ? {
              startedAt: current.startedAt ?? new Date(),
              pausedAt: null,
            }
          : {}),
        ...(status === 'paused'
          ? {
              pausedAt: new Date(),
            }
          : {}),
        ...(status === 'completed'
          ? {
              endedAt: new Date(),
            }
          : {}),
      },
    });

    return this.getMatch(matchId);
  }

  async appendDraw(
    matchId: string,
    payload: DrawEntryCommand & {
      actorUserId?: string;
      type?: StoredDrawEvent['type'];
      correctedFromId?: string;
    },
  ) {
    const sequence = (await this.prisma.drawEvent.count({
      where: {
        matchId,
      },
    })) + 1;

    const draw = await this.prisma.drawEvent.create({
      data: {
        matchId,
        letter: payload.letter,
        value: payload.value,
        display: buildDrawDisplay(payload.letter, payload.value),
        type: (payload.type ?? 'draw') as PrismaDrawEventType,
        sequence,
        correctedFromId: payload.correctedFromId,
        actorUserId: payload.actorUserId,
      },
    });

    return this.toStoredDrawEvent(draw);
  }

  async createPlayerSession(params: {
    roomId: string;
    name: string;
    avatar?: string;
    cardsRequested: number;
  }) {
    const currentMatch = await this.findCurrentMatch(params.roomId);
    if (!currentMatch) {
      throw new Error('Nao existe partida associada para esta sala.');
    }

    const existingSerials = new Set(
      (
        await this.prisma.bingoCard.findMany({
          select: {
            serial: true,
          },
        })
      ).map((entry) => entry.serial),
    );

    const cards = this.cardFactory.generateCards(params.cardsRequested, existingSerials);

    const createdSession = await this.prisma.$transaction(async (tx) => {
      const session = await tx.playerSession.create({
        data: {
          roomId: params.roomId,
          name: params.name,
          avatar: params.avatar ?? this.pickAvatar(),
          token: `room_${createId(10)}`,
          autoMark: true,
        },
      });

      for (const card of cards) {
        const bingoCard = await tx.bingoCard.create({
          data: {
            serial: card.serial,
            matrixJson: card.cells as unknown as Prisma.InputJsonValue,
          },
        });

        await tx.cardAssignment.create({
          data: {
            matchId: currentMatch.id,
            playerSessionId: session.id,
            bingoCardId: bingoCard.id,
          },
        });
      }

      return session.id;
    });

    return (await this.getPlayerByIdForRoom(createdSession, params.roomId))!;
  }

  private async getPlayerByIdForRoom(playerSessionId: string, roomId: string) {
    const currentMatch = await this.findCurrentMatch(roomId);
    if (!currentMatch) {
      return undefined;
    }

    const session = await this.prisma.playerSession.findUnique({
      where: {
        id: playerSessionId,
      },
      include: {
        assignments: {
          where: {
            matchId: currentMatch.id,
          },
          include: {
            bingoCard: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return session ? this.toStoredPlayerSession(session) : undefined;
  }

  private async toStoredRoom(room: {
    id: string;
    tenantId: string;
    name: string;
    joinCode: string;
    theme: string;
    allowAutoMark: boolean;
    allowManualMark: boolean;
    maxCardsPerPlayer: number;
    createdAt: Date;
  }) {
    const currentMatch = await this.findCurrentMatch(room.id);

    if (!currentMatch) {
      throw new Error(`Sala ${room.id} sem partida associada.`);
    }

    return this.toStoredRoomInline(room, currentMatch.id);
  }

  private toStoredRoomInline(
    room: {
      id: string;
      tenantId: string;
      name: string;
      joinCode: string;
      theme: string;
      allowAutoMark: boolean;
      allowManualMark: boolean;
      maxCardsPerPlayer: number;
      createdAt: Date;
    },
    matchId: string,
  ): StoredRoom {
    return {
      id: room.id,
      tenantId: room.tenantId,
      name: room.name,
      joinCode: room.joinCode,
      theme: room.theme as StoredRoom['theme'],
      allowAutoMark: room.allowAutoMark,
      allowManualMark: room.allowManualMark,
      maxCardsPerPlayer: room.maxCardsPerPlayer,
      createdAt: room.createdAt.toISOString(),
      matchId,
    };
  }

  private toStoredTenant(tenant: { id: string; name: string; slug: string; createdAt: Date }) {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenant.createdAt.toISOString(),
    } satisfies StoredTenant;
  }

  private toStoredUser(user: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    memberships: Array<{ tenantId: string; role: string }>;
  }) {
    const membership = user.memberships[0];

    if (!membership) {
      throw new Error(`Usuario ${user.id} sem membership.`);
    }

    return {
      id: user.id,
      tenantId: membership.tenantId,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: membership.role as StoredUser['role'],
      createdAt: user.createdAt.toISOString(),
    } satisfies StoredUser;
  }

  private toStoredMatch(match: {
    id: string;
    roomId: string;
    status: PrismaMatchStatus;
    startedAt: Date | null;
    pausedAt: Date | null;
    endedAt?: Date | null;
    prizeRounds: Array<{
      id: string;
      label: string;
      pattern: string;
      order: number;
      prize: string;
      completedAt: Date | null;
    }>;
    drawEvents: Array<{
      id: string;
      matchId: string;
      letter: string;
      value: number;
      display: string;
      type: PrismaDrawEventType;
      sequence: number;
      createdAt: Date;
      correctedFromId: string | null;
      actorUserId: string | null;
    }>;
  }) {
    return {
      id: match.id,
      roomId: match.roomId,
      status: match.status as MatchStatus,
      startedAt: match.startedAt?.toISOString(),
      pausedAt: match.pausedAt?.toISOString(),
      endedAt: match.endedAt?.toISOString(),
      prizeRounds: match.prizeRounds.map(
        (round) =>
          ({
            id: round.id,
            label: round.label,
            pattern: round.pattern as PrizeRoundConfig['pattern'],
            order: round.order,
            prize: round.prize,
            completedAt: round.completedAt?.toISOString(),
          }) satisfies PrizeRoundConfig,
      ),
      drawEvents: match.drawEvents.map((draw) => this.toStoredDrawEvent(draw)),
    } satisfies StoredMatch;
  }

  private toStoredDrawEvent(draw: {
    id: string;
    matchId: string;
    letter: string;
    value: number;
    display: string;
    type: PrismaDrawEventType;
    sequence: number;
    createdAt: Date;
    correctedFromId: string | null;
    actorUserId: string | null;
  }) {
    return {
      id: draw.id,
      matchId: draw.matchId,
      letter: draw.letter as BingoLetter,
      value: draw.value,
      display: draw.display,
      type: draw.type,
      sequence: draw.sequence,
      createdAt: draw.createdAt.toISOString(),
      correctedFromId: draw.correctedFromId ?? undefined,
      actorUserId: draw.actorUserId ?? undefined,
    } satisfies StoredDrawEvent;
  }

  private toStoredPlayerSession(session: {
    id: string;
    roomId: string;
    name: string;
    avatar: string;
    token: string;
    autoMark: boolean;
    createdAt: Date;
    assignments: Array<{
      bingoCard: {
        id: string;
        serial: string;
        matrixJson: unknown;
      };
    }>;
  }) {
    return {
      id: session.id,
      roomId: session.roomId,
      name: session.name,
      avatar: session.avatar,
      token: session.token,
      autoMark: session.autoMark,
      createdAt: session.createdAt.toISOString(),
      cards: session.assignments.map(
        (assignment) =>
          ({
            id: assignment.bingoCard.id,
            serial: assignment.bingoCard.serial,
            cells: assignment.bingoCard.matrixJson as StoredCard['cells'],
          }) satisfies StoredCard,
      ),
    } satisfies StoredPlayerSession;
  }

  private async findCurrentMatch(roomId: string) {
    return this.prisma.match.findFirst({
      where: {
        roomId,
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  private createDefaultPrizeRounds(matchId: string): Prisma.PrizeRoundCreateManyInput[] {
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

  private async generateUniqueJoinCode(tx: Prisma.TransactionClient) {
    while (true) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const existing = await tx.room.findUnique({
        where: {
          joinCode: code,
        },
      });

      if (!existing) {
        return code;
      }
    }
  }

  private pickAvatar() {
    const avatars = ['AV', 'BJ', 'CR', 'DL', 'EM', 'FN', 'GO', 'HP'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }
}
