import { Injectable, Logger } from '@nestjs/common';
import { hashSync } from 'bcryptjs';
import {
  Prisma,
  type MatchStatus as PrismaMatchStatus,
  type DrawEventType as PrismaDrawEventType,
  type PrizePattern as PrismaPrizePattern,
  type WinClaimStatus as PrismaWinClaimStatus,
} from '@prisma/client';
import type {
  BingoLetter,
  CreateRoomRequest,
  CreateTenantRequest,
  DrawEntryCommand,
  MatchStatus,
  StageMomentKey,
  StageMomentRequest,
  PrizeShowcaseRequest,
  TvRecentDrawsRequest,
  UpdatePrizeRoundsRequest,
  UpdatePlayerRequest,
} from '@bingo/contracts';
import { BingoCardFactory } from '../domain/bingo-card.factory';
import { createId } from '../domain/create-id';
import { buildDrawDisplay } from '../domain/bingo-rules';
import type {
  AppendAuditLogParams,
  CreateWinClaimParams,
  InvitePayload,
  StoredAdminHistory,
  StoredAuditLog,
  StoredCard,
  StoredDrawEvent,
  StoredMatch,
  StoredPlayerSession,
  StoredPrintedCard,
  StoredPrizeRound,
  StoredRoom,
  StoredTenant,
  StoredUser,
  StoredWinClaim,
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
      this.logger.warn(`Prisma indisponivel: ${String(error)}`);
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

  async getPlayerById(playerSessionId: string) {
    const session = await this.prisma.playerSession.findUnique({
      where: {
        id: playerSessionId,
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
          passwordHash: hashSync(payload.password ?? createId(16), 10),
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
        data: this.createInitialPrizeRounds(match.id, payload.prizeRounds),
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
        ...(patch.allowAutoMark !== undefined
          ? { allowAutoMark: patch.allowAutoMark }
          : {}),
        ...(patch.allowManualMark !== undefined
          ? { allowManualMark: patch.allowManualMark }
          : {}),
      },
    });

    return this.toStoredRoom(room);
  }

  async deleteRoom(roomId: string) {
    const room = await this.prisma.room.delete({
      where: {
        id: roomId,
      },
    });

    return this.toStoredRoomInline(room, '');
  }

  async updatePrizeRounds(matchId: string, payload: UpdatePrizeRoundsRequest) {
    await this.prisma.$transaction(async (tx) => {
      const existingRounds = await tx.prizeRound.findMany({
        where: {
          matchId,
        },
        orderBy: {
          order: 'asc',
        },
      });

      const incomingExistingIds = new Set(
        payload.rounds
          .map((round) => round.id)
          .filter((roundId): roundId is string => Boolean(roundId)),
      );
      const removableRounds = existingRounds.filter(
        (round) => !round.completedAt && !incomingExistingIds.has(round.id),
      );
      const removableIds = removableRounds.map((round) => round.id);

      if (removableIds.length > 0) {
        await tx.match.updateMany({
          where: {
            id: matchId,
            featuredPrizeRoundId: {
              in: removableIds,
            },
          },
          data: {
            featuredPrizeRoundId: null,
            prizeShowcaseVisible: false,
          },
        });
        await tx.prizeRound.deleteMany({
          where: {
            id: {
              in: removableIds,
            },
          },
        });
      }

      const keptExistingRounds = existingRounds.filter((round) =>
        incomingExistingIds.has(round.id),
      );
      for (const [index, round] of keptExistingRounds.entries()) {
        await tx.prizeRound.update({
          where: {
            id: round.id,
          },
          data: {
            order: 10_000 + index,
          },
        });
      }

      for (const [index, round] of payload.rounds.entries()) {
        const data = this.toPrizeRoundWriteData(round, index + 1);

        if (round.id) {
          await tx.prizeRound.update({
            where: {
              id: round.id,
            },
            data,
          });
          continue;
        }

        await tx.prizeRound.create({
          data: {
            matchId,
            ...data,
          },
        });
      }
    });

    return this.getMatch(matchId);
  }

  async setPrizeShowcase(matchId: string, payload: PrizeShowcaseRequest) {
    await this.prisma.match.update({
      where: {
        id: matchId,
      },
      data: {
        featuredPrizeRoundId: payload.visible ? payload.roundId : null,
        prizeShowcaseVisible: payload.visible,
        ...(payload.visible
          ? { recentDrawsVisible: false, tvResetAt: null }
          : {}),
      },
    });

    return this.getMatch(matchId);
  }

  async setStageMoment(matchId: string, payload: StageMomentRequest) {
    const expiresAt =
      payload.visible && payload.durationSeconds
        ? new Date(Date.now() + payload.durationSeconds * 1000)
        : null;
    const isNearWinAlert = payload.visible && payload.key === 'near_win';

    await this.prisma.match.update({
      where: {
        id: matchId,
      },
      data: {
        stageMomentKey: payload.visible ? (payload.key ?? 'attention') : null,
        stageMomentTitle: payload.visible ? (payload.title ?? null) : null,
        stageMomentMessage: payload.visible ? (payload.message ?? null) : null,
        stageMomentExpiresAt: payload.visible ? expiresAt : null,
        stageMomentVisible: payload.visible,
        ...(payload.visible
          ? {
              ...(isNearWinAlert ? {} : { recentDrawsVisible: false }),
              tvResetAt: null,
            }
          : {}),
      },
    });

    return this.getMatch(matchId);
  }

  async setRecentDrawsShowcase(matchId: string, payload: TvRecentDrawsRequest) {
    await this.prisma.match.update({
      where: {
        id: matchId,
      },
      data: {
        recentDrawsVisible: payload.visible,
        ...(payload.visible
          ? {
              featuredPrizeRoundId: null,
              prizeShowcaseVisible: false,
              stageMomentKey: null,
              stageMomentTitle: null,
              stageMomentMessage: null,
              stageMomentExpiresAt: null,
              stageMomentVisible: false,
              tvResetAt: null,
            }
          : {}),
      },
    });

    return this.getMatch(matchId);
  }

  async resetTvPresentation(matchId: string) {
    await this.prisma.match.update({
      where: {
        id: matchId,
      },
      data: {
        featuredPrizeRoundId: null,
        prizeShowcaseVisible: false,
        stageMomentKey: null,
        stageMomentTitle: null,
        stageMomentMessage: null,
        stageMomentExpiresAt: null,
        stageMomentVisible: false,
        recentDrawsVisible: false,
        tvResetAt: new Date(),
      },
    });

    return this.getMatch(matchId);
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

    const now = new Date();

    await this.prisma.match.update({
      where: {
        id: matchId,
      },
      data: {
        status: status as PrismaMatchStatus,
        ...(status === 'live'
          ? {
              startedAt: current.startedAt ?? now,
              pausedAt: null,
              endedAt: null,
            }
          : {}),
        ...(status === 'paused'
          ? {
              pausedAt: now,
            }
          : {}),
        ...(status === 'completed'
          ? {
              pausedAt: null,
              endedAt: now,
              featuredPrizeRoundId: null,
              prizeShowcaseVisible: false,
              stageMomentKey: null,
              stageMomentTitle: null,
              stageMomentMessage: null,
              stageMomentExpiresAt: null,
              stageMomentVisible: false,
              recentDrawsVisible: false,
              tvResetAt: now,
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
    const sequence =
      (await this.prisma.drawEvent.count({
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

  async createWinClaim(params: CreateWinClaimParams) {
    const claim = await this.prisma.winClaim.create({
      data: {
        tenantId: params.tenantId,
        roomId: params.roomId,
        matchId: params.matchId,
        playerSessionId: params.playerSessionId,
        playerName: params.playerName,
        roundId: params.roundId,
        cardId: params.cardId,
        triggeredByDrawId: params.triggeredByDrawId,
        status: params.status as PrismaWinClaimStatus,
        reason: params.reason,
        ...(params.snapshot !== undefined
          ? { snapshotJson: params.snapshot as Prisma.InputJsonValue }
          : {}),
      },
    });

    return this.toStoredWinClaim(claim);
  }

  async appendAuditLog(params: AppendAuditLogParams) {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        roomId: params.roomId,
        matchId: params.matchId,
        userId: params.userId,
        actorType: params.actorType,
        actorName: params.actorName,
        action: params.action,
        summary: params.summary,
        entityType: params.entityType,
        entityId: params.entityId,
        ...(params.payload !== undefined
          ? { payloadJson: params.payload as Prisma.InputJsonValue }
          : {}),
      },
    });

    return this.toStoredAuditLog(auditLog);
  }

  async getRoomHistory(
    roomId: string,
    matchId?: string,
  ): Promise<StoredAdminHistory> {
    const filter = {
      OR: [
        {
          roomId,
        },
        ...(matchId
          ? [
              {
                matchId,
              },
            ]
          : []),
      ],
    };

    const [auditLogs, winClaims] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: filter,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.winClaim.findMany({
        where: filter,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const storedAuditLogs = auditLogs.map((entry) =>
      this.toStoredAuditLog(entry),
    );
    const storedWinClaims = winClaims.map((entry) =>
      this.toStoredWinClaim(entry),
    );
    const items = [
      ...storedAuditLogs.map((entry) => ({
        id: entry.id,
        type: 'audit' as const,
        occurredAt: entry.createdAt,
        action: entry.action,
        summary: entry.summary ?? entry.action,
        actorType: entry.actorType,
        actorName: entry.actorName,
        roomId: entry.roomId,
        matchId: entry.matchId,
        payload: entry.payload,
      })),
      ...storedWinClaims.map((entry) => ({
        id: entry.id,
        type: 'win_claim' as const,
        occurredAt: entry.createdAt,
        action: `win_claim.${entry.status}`,
        summary: entry.reason ?? `Pedido de bingo ${entry.status}`,
        actorType: 'player' as const,
        actorName: entry.playerName,
        roomId: entry.roomId,
        matchId: entry.matchId,
        playerSessionId: entry.playerSessionId,
        winClaimId: entry.id,
        drawEventId: entry.triggeredByDrawId,
        payload: {
          status: entry.status,
          roundId: entry.roundId,
          cardId: entry.cardId,
          snapshot: entry.snapshot,
        },
      })),
    ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

    return {
      items,
      auditLogs: storedAuditLogs,
      winClaims: storedWinClaims,
    };
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

    const cards = this.cardFactory.generateCards(
      params.cardsRequested,
      existingSerials,
    );

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

  async generatePrintableCards(
    roomId: string,
    quantity: number,
    printBatchId: string,
  ) {
    const existingSerials = new Set(
      (
        await this.prisma.bingoCard.findMany({
          select: {
            serial: true,
          },
        })
      ).map((entry) => entry.serial),
    );
    const existingAccessCodes = new Set(
      (
        await this.prisma.bingoCard.findMany({
          where: {
            digitalAccessCode: {
              not: null,
            },
          },
          select: {
            digitalAccessCode: true,
          },
        })
      )
        .map((entry) => entry.digitalAccessCode)
        .filter((entry): entry is string => Boolean(entry)),
    );

    const issuedAt = new Date();
    const cards = this.cardFactory
      .generateCards(quantity, existingSerials)
      .map((card) => ({
        ...card,
        printedRoomId: roomId,
        printBatchId,
        digitalAccessCode:
          this.createPrintableCardAccessCode(existingAccessCodes),
        printedAt: issuedAt.toISOString(),
      }));

    await this.prisma.bingoCard.createMany({
      data: cards.map((card) => ({
        id: card.id,
        serial: card.serial,
        matrixJson: card.cells as unknown as Prisma.InputJsonValue,
        printedRoomId: card.printedRoomId,
        printBatchId: card.printBatchId,
        digitalAccessCode: card.digitalAccessCode,
        printedAt: issuedAt,
      })),
    });

    return cards;
  }

  async getPrintableCardByAccessCode(accessCode: string) {
    const normalized = this.normalizePrintableCardLookup(accessCode);
    const card = await this.prisma.bingoCard.findUnique({
      where: {
        digitalAccessCode: normalized,
      },
      include: {
        printedRoom: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!card?.printedRoom || !card.digitalAccessCode) {
      return undefined;
    }

    return {
      ...this.toStoredCard(card),
      room: await this.toStoredRoom(card.printedRoom),
      tenantName: card.printedRoom.tenant.name,
    } satisfies StoredPrintedCard;
  }

  async findPrintableCardForRoom(roomId: string, codeOrSerial: string) {
    const normalized = this.normalizePrintableCardLookup(codeOrSerial);
    const card = await this.prisma.bingoCard.findFirst({
      where: {
        printedRoomId: roomId,
        OR: [
          {
            digitalAccessCode: normalized,
          },
          {
            serial: normalized.toUpperCase(),
          },
        ],
      },
    });

    return card ? this.toStoredCard(card) : undefined;
  }

  async updatePlayerSession(
    playerSessionId: string,
    patch: UpdatePlayerRequest,
  ) {
    const existing = await this.getPlayerById(playerSessionId);
    if (!existing) {
      return undefined;
    }

    await this.prisma.playerSession.update({
      where: {
        id: playerSessionId,
      },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.avatar !== undefined ? { avatar: patch.avatar } : {}),
        ...(patch.autoMark !== undefined ? { autoMark: patch.autoMark } : {}),
      },
    });

    return this.getPlayerByIdForRoom(playerSessionId, existing.roomId);
  }

  async deletePlayerSession(playerSessionId: string) {
    const existing = await this.getPlayerById(playerSessionId);
    if (!existing) {
      return undefined;
    }

    await this.prisma.playerSession.delete({
      where: {
        id: playerSessionId,
      },
    });

    return existing;
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

  private toStoredTenant(tenant: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
  }) {
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
    featuredPrizeRoundId: string | null;
    prizeShowcaseVisible: boolean;
    stageMomentKey: string | null;
    stageMomentTitle: string | null;
    stageMomentMessage: string | null;
    stageMomentExpiresAt: Date | null;
    stageMomentVisible: boolean;
    recentDrawsVisible: boolean;
    tvResetAt: Date | null;
      prizeRounds: Array<{
        id: string;
        label: string;
        pattern: string;
        targetMarks: number | null;
        order: number;
        prize: string;
        description: string | null;
        photoDataUrl: string | null;
        photoUpdatedAt: Date | null;
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
      featuredPrizeRoundId: match.featuredPrizeRoundId ?? undefined,
      prizeShowcaseVisible: match.prizeShowcaseVisible,
      stageMomentKey:
        (match.stageMomentKey as StageMomentKey | null) ?? undefined,
      stageMomentTitle: match.stageMomentTitle ?? undefined,
      stageMomentMessage: match.stageMomentMessage ?? undefined,
      stageMomentExpiresAt: match.stageMomentExpiresAt?.toISOString(),
      stageMomentVisible: match.stageMomentVisible,
      recentDrawsVisible: match.recentDrawsVisible,
      tvResetAt: match.tvResetAt?.toISOString(),
      prizeRounds: match.prizeRounds.map(
        (round) =>
          ({
            id: round.id,
            label: round.label,
            pattern: round.pattern as StoredPrizeRound['pattern'],
            targetMarks: round.targetMarks ?? undefined,
            order: round.order,
            prize: round.prize,
            description: round.description ?? undefined,
            photoDataUrl: round.photoDataUrl ?? undefined,
            photoUpdatedAt: round.photoUpdatedAt?.toISOString(),
            completedAt: round.completedAt?.toISOString(),
          }) satisfies StoredPrizeRound,
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

  private toStoredWinClaim(claim: {
    id: string;
    tenantId: string | null;
    roomId: string | null;
    matchId: string;
    playerSessionId: string | null;
    playerName: string | null;
    roundId: string | null;
    cardId: string | null;
    triggeredByDrawId: string | null;
    status: PrismaWinClaimStatus;
    reason: string | null;
    snapshotJson: Prisma.JsonValue | null;
    createdAt: Date;
  }) {
    return {
      id: claim.id,
      tenantId: claim.tenantId ?? undefined,
      roomId: claim.roomId ?? undefined,
      matchId: claim.matchId,
      playerSessionId: claim.playerSessionId ?? undefined,
      playerName: claim.playerName ?? undefined,
      roundId: claim.roundId ?? undefined,
      cardId: claim.cardId ?? undefined,
      triggeredByDrawId: claim.triggeredByDrawId ?? undefined,
      status: claim.status,
      reason: claim.reason ?? undefined,
      snapshot: this.toJsonRecord(claim.snapshotJson),
      createdAt: claim.createdAt.toISOString(),
    } satisfies StoredWinClaim;
  }

  private toStoredAuditLog(auditLog: {
    id: string;
    tenantId: string;
    roomId: string | null;
    matchId: string | null;
    userId: string | null;
    actorType: string;
    actorName: string | null;
    action: string;
    summary: string | null;
    entityType: string | null;
    entityId: string | null;
    payloadJson: Prisma.JsonValue | null;
    createdAt: Date;
  }) {
    return {
      id: auditLog.id,
      tenantId: auditLog.tenantId,
      roomId: auditLog.roomId ?? undefined,
      matchId: auditLog.matchId ?? undefined,
      userId: auditLog.userId ?? undefined,
      actorType: auditLog.actorType as StoredAuditLog['actorType'],
      actorName: auditLog.actorName ?? undefined,
      action: auditLog.action,
      summary: auditLog.summary ?? undefined,
      entityType: auditLog.entityType ?? undefined,
      entityId: auditLog.entityId ?? undefined,
      payload: this.toJsonRecord(auditLog.payloadJson),
      createdAt: auditLog.createdAt.toISOString(),
    } satisfies StoredAuditLog;
  }

  private toJsonRecord(value: Prisma.JsonValue | null | undefined) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  private toStoredCard(card: {
    id: string;
    serial: string;
    matrixJson: unknown;
    printedRoomId?: string | null;
    printBatchId?: string | null;
    digitalAccessCode?: string | null;
    printedAt?: Date | null;
  }) {
    return {
      id: card.id,
      serial: card.serial,
      cells: card.matrixJson as StoredCard['cells'],
      printedRoomId: card.printedRoomId ?? undefined,
      printBatchId: card.printBatchId ?? undefined,
      digitalAccessCode: card.digitalAccessCode ?? undefined,
      printedAt: card.printedAt?.toISOString(),
    } satisfies StoredCard;
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
        printedRoomId?: string | null;
        printBatchId?: string | null;
        digitalAccessCode?: string | null;
        printedAt?: Date | null;
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
      cards: session.assignments.map((assignment) =>
        this.toStoredCard(assignment.bingoCard),
      ),
    } satisfies StoredPlayerSession;
  }

  private createPrintableCardAccessCode(existingAccessCodes: Set<string>) {
    let accessCode = '';

    while (!accessCode || existingAccessCodes.has(accessCode)) {
      accessCode = `ct_${createId(24)}`;
    }

    existingAccessCodes.add(accessCode);
    return accessCode;
  }

  private normalizePrintableCardLookup(value: string) {
    let normalized = value.trim();

    try {
      normalized = decodeURIComponent(normalized);
    } catch {
      normalized = value.trim();
    }

    const withoutQuery = normalized.split('?')[0].split('#')[0];
    const parts = withoutQuery.split('/').filter(Boolean);
    return (parts.at(-1) ?? withoutQuery).trim();
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

  private createDefaultPrizeRounds(
    matchId: string,
  ): Prisma.PrizeRoundCreateManyInput[] {
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

  private createInitialPrizeRounds(
    matchId: string,
    rounds?: CreateRoomRequest['prizeRounds'],
  ): Prisma.PrizeRoundCreateManyInput[] {
    if (!rounds?.length) {
      return this.createDefaultPrizeRounds(matchId);
    }

    return rounds.map((round, index) => ({
      matchId,
      label: round.label.trim(),
      pattern: round.pattern as PrismaPrizePattern,
      targetMarks:
        round.pattern === 'marked_count' ? (round.targetMarks ?? 3) : null,
      order: index + 1,
      prize: round.prize.trim(),
      description: round.description?.trim() || null,
      photoDataUrl: round.photoDataUrl ?? null,
      photoUpdatedAt: round.photoDataUrl ? new Date() : null,
    }));
  }

  private toPrizeRoundWriteData(
    round: UpdatePrizeRoundsRequest['rounds'][number],
    order: number,
  ) {
    return {
      label: round.label,
      pattern: round.pattern as PrismaPrizePattern,
      targetMarks:
        round.pattern === 'marked_count' ? (round.targetMarks ?? 3) : null,
      order,
      prize: round.prize,
      description: round.description?.trim() || null,
      ...(round.removePhoto
        ? {
            photoDataUrl: null,
            photoUpdatedAt: null,
          }
        : round.photoDataUrl
          ? {
              photoDataUrl: round.photoDataUrl,
              photoUpdatedAt: new Date(),
            }
          : {}),
    };
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
