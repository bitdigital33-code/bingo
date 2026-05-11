import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { compareSync } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import type {
  AdminHistoryResponseDto,
  AuthResponseDto,
  CreateRoomRequest,
  CreateTenantRequest,
  DeleteRoomResponseDto,
  DrawEntryCommand,
  GeneratePrintableCardsRequest,
  GeneratePrintableCardsResponse,
  JoinRoomRequest,
  LoginRequest,
  MatchCommandResponse,
  PrintedCardDigitalResponseDto,
  PrintableCardDto,
  PrizeShowcaseRequest,
  RoomSnapshot,
  StageMomentRequest,
  TvRecentDrawsRequest,
  UpdatePrizeRoundsRequest,
  UpdatePlayerRequest,
  VerifyPrintableCardRequest,
  VerifyPrintableCardResponseDto,
} from '@bingo/contracts';
import { buildDrawDisplay } from '../domain/bingo-rules';
import { BingoEngineService } from '../domain/bingo-engine.service';
import type {
  InvitePayload,
  StoredCard,
  StoredRoom,
  StoredUser,
} from '../domain/internal-types';
import { createId } from '../domain/create-id';
import { AnalyticsQueueService } from '../infrastructure/analytics-queue.service';
import { BingoStoreService } from '../infrastructure/bingo-store.service';
import { RedisBridgeService } from '../infrastructure/redis-bridge.service';
import { RealtimeGateway } from '../presentation/realtime.gateway';

@Injectable()
export class BingoFacadeService {
  private readonly webBaseUrl =
    process.env.WEB_BASE_URL ?? 'http://localhost:5173';

  constructor(
    private readonly analyticsQueue: AnalyticsQueueService,
    private readonly engine: BingoEngineService,
    private readonly jwtService: JwtService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly redisBridge: RedisBridgeService,
    private readonly store: BingoStoreService,
  ) {}

  async getBootstrap(user: StoredUser) {
    const rooms = await Promise.all(
      (await this.store.getRoomsForTenant(user.tenantId)).map((room) =>
        this.snapshotRoom(room),
      ),
    );

    return {
      persistenceMode: await this.store.getMode(),
      rooms,
    };
  }

  async createTenant(payload: CreateTenantRequest): Promise<AuthResponseDto> {
    const existing = await this.store.getUserByEmail(payload.ownerEmail);
    if (existing) {
      throw new BadRequestException('Ja existe uma conta com este email.');
    }

    const created = await this.store.createTenant(payload);
    await this.store.appendAuditLog({
      tenantId: created.tenant.id,
      roomId: created.room.id,
      matchId: created.room.matchId,
      userId: created.owner.id,
      actorType: 'admin',
      actorName: created.owner.name,
      action: 'tenant.created',
      summary: `Tenant ${created.tenant.name} criado com sala inicial.`,
      entityType: 'tenant',
      entityId: created.tenant.id,
      payload: {
        slug: created.tenant.slug,
        roomCode: created.room.joinCode,
      },
    });
    return this.buildAuthResponse(created.owner.id);
  }

  async login(payload: LoginRequest): Promise<AuthResponseDto> {
    const user = await this.store.getUserByEmail(payload.email);

    if (!user || !compareSync(payload.password, user.passwordHash)) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    return this.buildAuthResponse(user.id);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: process.env.JWT_SECRET ?? 'bingo-secret',
      });
      return this.buildAuthResponse(payload.sub);
    } catch {
      throw new UnauthorizedException('Refresh token invalido.');
    }
  }

  async inviteMember(user: StoredUser, payload: InvitePayload) {
    const existing = await this.store.getUserByEmail(payload.email);
    if (existing) {
      throw new BadRequestException('Email ja cadastrado.');
    }

    const password = payload.password ?? this.buildTemporaryPassword();
    const member = await this.store.inviteMember(user.tenantId, {
      ...payload,
      password,
    });
    await this.auditAdmin(user, {
      action: 'member.invited',
      summary: `${user.name} convidou ${member.email} como ${member.role}.`,
      entityType: 'user',
      entityId: member.id,
      payload: {
        email: member.email,
        role: member.role,
      },
    });
    return {
      id: member.id,
      email: member.email,
      role: member.role,
      passwordHint: password,
    };
  }

  async listRooms(user: StoredUser) {
    return Promise.all(
      (await this.store.getRoomsForTenant(user.tenantId)).map((room) =>
        this.snapshotRoom(room),
      ),
    );
  }

  async createRoom(
    user: StoredUser,
    payload: CreateRoomRequest,
  ): Promise<MatchCommandResponse> {
    const room = await this.store.createRoom(user.tenantId, payload);
    await this.auditAdmin(user, {
      room,
      matchId: room.matchId,
      action: 'room.created',
      summary: `${user.name} criou a sala ${room.name}.`,
      entityType: 'room',
      entityId: room.id,
      payload: {
        roomCode: room.joinCode,
        theme: room.theme,
        maxCardsPerPlayer: room.maxCardsPerPlayer,
      },
    });
    return {
      room: await this.snapshotRoom(room),
    };
  }

  async generatePrintableCards(
    user: StoredUser,
    roomId: string,
    payload: GeneratePrintableCardsRequest,
  ): Promise<GeneratePrintableCardsResponse> {
    const room = await this.getTenantRoom(user, roomId);
    const quantity = payload.quantity;
    const title = payload.title?.trim() || room.name;
    const cardsPerPage = payload.cardsPerPage ?? 4;
    const printBatchId = createId(18);
    const cards = await this.store.generatePrintableCards(
      room.id,
      quantity,
      printBatchId,
    );

    await this.auditAdmin(user, {
      room,
      matchId: room.matchId,
      action: 'print_cards.generated',
      summary: `${user.name} gerou ${cards.length} cartela(s) impressas para ${room.name}.`,
      entityType: 'print_card_batch',
      entityId: room.id,
      payload: {
        printBatchId,
        title,
        quantity: cards.length,
        cardsPerPage,
        serials: cards.map((card) => card.serial),
      },
    });

    return {
      roomId: room.id,
      roomName: room.name,
      roomCode: room.joinCode,
      title,
      generatedAt: new Date().toISOString(),
      cardsPerPage,
      cards: cards.map((card) => this.toPrintableCardDto(card)),
    };
  }

  async getPrintedCard(
    accessCode: string,
  ): Promise<PrintedCardDigitalResponseDto> {
    const printedCard =
      await this.store.getPrintableCardByAccessCode(accessCode);
    if (!printedCard) {
      throw new NotFoundException('Cartela impressa nao encontrada.');
    }

    return {
      roomId: printedCard.room.id,
      roomName: printedCard.room.name,
      roomCode: printedCard.room.joinCode,
      tenantName: printedCard.tenantName,
      theme: printedCard.room.theme,
      issuedAt: printedCard.printedAt,
      card: this.toPrintableCardDto(printedCard),
    };
  }

  async verifyPrintableCard(
    user: StoredUser,
    roomId: string,
    payload: VerifyPrintableCardRequest,
  ): Promise<VerifyPrintableCardResponseDto> {
    const room = await this.getTenantRoom(user, roomId);
    const lookup = payload.code.trim();
    if (!lookup) {
      throw new BadRequestException(
        'Informe o QR, codigo ou serial da cartela.',
      );
    }

    const card = await this.store.findPrintableCardForRoom(room.id, lookup);
    const response: VerifyPrintableCardResponseDto = {
      authentic: Boolean(card?.digitalAccessCode),
      reason: card?.digitalAccessCode
        ? undefined
        : 'Cartela nao emitida para esta sala ou codigo invalido.',
      roomId: room.id,
      roomName: room.name,
      roomCode: room.joinCode,
      card: card ? this.toPrintableCardDto(card) : undefined,
    };

    await this.auditAdmin(user, {
      room,
      matchId: room.matchId,
      action: 'print_card.verified',
      summary: response.authentic
        ? `${user.name} conferiu a cartela ${card!.serial}.`
        : `${user.name} tentou conferir uma cartela nao autenticada.`,
      entityType: 'print_card',
      entityId: card?.id ?? room.id,
      payload: {
        authentic: response.authentic,
        lookup,
        serial: card?.serial,
      },
    });

    return response;
  }

  async updatePrizeRounds(
    user: StoredUser,
    roomId: string,
    payload: UpdatePrizeRoundsRequest,
  ): Promise<MatchCommandResponse> {
    const room = await this.getTenantRoom(user, roomId);
    const match = await this.store.getMatch(room.matchId);
    if (!match) {
      throw new NotFoundException('Partida nao encontrada.');
    }

    const currentIds = new Set(match.prizeRounds.map((round) => round.id));
    for (const round of payload.rounds) {
      if (round.id && !currentIds.has(round.id)) {
        throw new BadRequestException(
          'Rodada de premio invalida para esta sala.',
        );
      }
      if (
        round.pattern === 'marked_count' &&
        (!round.targetMarks || round.targetMarks < 1)
      ) {
        throw new BadRequestException(
          'Informe quantas bolas valem para este premio.',
        );
      }
    }

    await this.store.updatePrizeRounds(room.matchId, payload);
    await this.auditAdmin(user, {
      room,
      matchId: room.matchId,
      action: 'prize_rounds.updated',
      summary: `${user.name} atualizou os premios da noite.`,
      entityType: 'match',
      entityId: room.matchId,
      payload: {
        rounds: payload.rounds,
      },
    });

    return this.broadcastRoom(room, 'prize.rounds.updated');
  }

  async setPrizeShowcase(
    user: StoredUser,
    roomId: string,
    payload: PrizeShowcaseRequest,
  ): Promise<MatchCommandResponse> {
    const room = await this.getTenantRoom(user, roomId);
    const match = await this.store.getMatch(room.matchId);
    if (!match) {
      throw new NotFoundException('Partida nao encontrada.');
    }

    const round = payload.roundId
      ? match.prizeRounds.find((entry) => entry.id === payload.roundId)
      : undefined;
    if (payload.visible && !round) {
      throw new BadRequestException(
        'Escolha um premio valido para apresentar no telao.',
      );
    }

    await this.store.setPrizeShowcase(room.matchId, {
      visible: payload.visible,
      roundId: round?.id,
    });
    await this.auditAdmin(user, {
      room,
      matchId: room.matchId,
      action: payload.visible
        ? 'prize.showcase.presented'
        : 'prize.showcase.hidden',
      summary: payload.visible
        ? `${user.name} apresentou ${round?.label} no telao.`
        : `${user.name} ocultou o premio do telao.`,
      entityType: 'prize_round',
      entityId: round?.id,
      payload: {
        roundId: round?.id,
        label: round?.label,
        prize: round?.prize,
      },
    });

    return this.broadcastRoom(room, 'prize.showcase.changed');
  }

  async setStageMoment(
    user: StoredUser,
    roomId: string,
    payload: StageMomentRequest,
  ): Promise<MatchCommandResponse> {
    const room = await this.getTenantRoom(user, roomId);

    if (
      payload.visible &&
      (!payload.key || !payload.title?.trim() || !payload.message?.trim())
    ) {
      throw new BadRequestException(
        'Informe o momento, o titulo e a mensagem do telao.',
      );
    }

    await this.store.setStageMoment(room.matchId, {
      visible: payload.visible,
      key: payload.visible ? payload.key : undefined,
      title: payload.visible ? payload.title?.trim() : undefined,
      message: payload.visible ? payload.message?.trim() : undefined,
      durationSeconds: payload.visible ? payload.durationSeconds : undefined,
    });
    await this.auditAdmin(user, {
      room,
      matchId: room.matchId,
      action: payload.visible
        ? 'stage.moment.presented'
        : 'stage.moment.hidden',
      summary: payload.visible
        ? `${user.name} colocou ${payload.title} no telao.`
        : `${user.name} limpou o momento especial do telao.`,
      entityType: 'match',
      entityId: room.matchId,
      payload: {
        key: payload.key,
        title: payload.title,
        message: payload.message,
        durationSeconds: payload.durationSeconds,
      },
    });

    return this.broadcastRoom(room, 'stage.moment.changed');
  }

  async setRecentDrawsShowcase(
    user: StoredUser,
    roomId: string,
    payload: TvRecentDrawsRequest,
  ): Promise<MatchCommandResponse> {
    const room = await this.getTenantRoom(user, roomId);

    await this.store.setRecentDrawsShowcase(room.matchId, payload);
    await this.auditAdmin(user, {
      room,
      matchId: room.matchId,
      action: payload.visible
        ? 'tv.recent_draws.presented'
        : 'tv.recent_draws.hidden',
      summary: payload.visible
        ? `${user.name} abriu os ultimos numeros no telao.`
        : `${user.name} ocultou os ultimos numeros do telao.`,
      entityType: 'match',
      entityId: room.matchId,
      payload: {
        visible: payload.visible,
      },
    });

    return this.broadcastRoom(room, 'tv.recent-draws.changed');
  }

  async resetTvPresentation(
    user: StoredUser,
    roomId: string,
  ): Promise<MatchCommandResponse> {
    const room = await this.getTenantRoom(user, roomId);

    await this.store.resetTvPresentation(room.matchId);
    await this.auditAdmin(user, {
      room,
      matchId: room.matchId,
      action: 'tv.presentation.reset',
      summary: `${user.name} zerou a apresentacao do telao.`,
      entityType: 'match',
      entityId: room.matchId,
    });

    return this.broadcastRoom(room, 'tv.presentation.reset');
  }

  async updateRoom(
    user: StoredUser,
    roomId: string,
    payload: Partial<CreateRoomRequest>,
  ) {
    const room = await this.getTenantRoom(user, roomId);
    const updatedRoom = await this.store.updateRoom(room.id, payload);

    if (!updatedRoom) {
      throw new NotFoundException('Sala nao encontrada.');
    }

    await this.auditAdmin(user, {
      room: updatedRoom,
      matchId: updatedRoom.matchId,
      action: 'room.updated',
      summary: `${user.name} atualizou a sala ${updatedRoom.name}.`,
      entityType: 'room',
      entityId: updatedRoom.id,
      payload: {
        before: {
          name: room.name,
          theme: room.theme,
          allowAutoMark: room.allowAutoMark,
          allowManualMark: room.allowManualMark,
          maxCardsPerPlayer: room.maxCardsPerPlayer,
        },
        after: payload,
      },
    });

    return {
      room: await this.snapshotRoom(updatedRoom),
    };
  }

  async deleteRoom(
    user: StoredUser,
    roomId: string,
  ): Promise<DeleteRoomResponseDto> {
    const room = await this.getTenantRoom(user, roomId);
    const tenantRooms = await this.store.getRoomsForTenant(user.tenantId);
    if (tenantRooms.length <= 1) {
      throw new BadRequestException(
        'Crie outra sala antes de excluir a unica sala da organizacao.',
      );
    }

    await this.auditAdmin(user, {
      room,
      matchId: room.matchId,
      action: 'room.deleted',
      summary: `${user.name} excluiu a sala ${room.name}.`,
      entityType: 'room',
      entityId: room.id,
      payload: {
        roomCode: room.joinCode,
        roomName: room.name,
      },
    });

    const deleted = await this.store.deleteRoom(room.id);
    if (!deleted) {
      throw new NotFoundException('Sala nao encontrada.');
    }

    return {
      deletedRoomId: room.id,
      rooms: await this.listRooms(user),
    };
  }

  async updatePlayer(
    user: StoredUser,
    roomId: string,
    playerSessionId: string,
    payload: UpdatePlayerRequest,
  ) {
    const room = await this.getTenantRoom(user, roomId);
    const player = await this.store.getPlayerById(playerSessionId);
    if (!player || player.roomId !== room.id) {
      throw new NotFoundException('Jogador nao encontrado nesta sala.');
    }

    if (
      payload.name === undefined &&
      payload.avatar === undefined &&
      payload.autoMark === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos uma alteracao para o jogador.',
      );
    }

    const updatedPlayer = await this.store.updatePlayerSession(
      player.id,
      payload,
    );
    if (!updatedPlayer) {
      throw new NotFoundException('Jogador nao encontrado nesta sala.');
    }

    await this.auditAdmin(user, {
      room,
      matchId: room.matchId,
      action: 'player.updated',
      summary: `${user.name} atualizou ${updatedPlayer.name}.`,
      entityType: 'player_session',
      entityId: player.id,
      payload: {
        before: {
          name: player.name,
          avatar: player.avatar,
          autoMark: player.autoMark,
        },
        after: payload,
      },
    });

    return this.broadcastRoom(room, 'player.presence.updated');
  }

  async removePlayer(
    user: StoredUser,
    roomId: string,
    playerSessionId: string,
  ) {
    const room = await this.getTenantRoom(user, roomId);
    const player = await this.store.getPlayerById(playerSessionId);
    if (!player || player.roomId !== room.id) {
      throw new NotFoundException('Jogador nao encontrado nesta sala.');
    }

    const removedPlayer = await this.store.deletePlayerSession(player.id);
    if (!removedPlayer) {
      throw new NotFoundException('Jogador nao encontrado nesta sala.');
    }

    await this.auditAdmin(user, {
      room,
      matchId: room.matchId,
      action: 'player.removed',
      summary: `${user.name} removeu ${removedPlayer.name} da sala.`,
      entityType: 'player_session',
      entityId: removedPlayer.id,
      payload: {
        name: removedPlayer.name,
        cards: removedPlayer.cards.length,
      },
    });

    return this.broadcastRoom(room, 'player.presence.updated');
  }

  async startMatch(user: StoredUser, roomId: string) {
    const room = await this.getTenantRoom(user, roomId);
    await this.store.updateMatchStatus(room.matchId, 'live');
    await this.auditAdmin(user, {
      room,
      matchId: room.matchId,
      action: 'match.started',
      summary: `${user.name} colocou a partida ao vivo.`,
      entityType: 'match',
      entityId: room.matchId,
      payload: {
        status: 'live',
      },
    });
    return this.broadcastRoom(room, 'match.status.changed');
  }

  async pauseMatch(user: StoredUser, matchId: string) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    await this.store.updateMatchStatus(matchId, 'paused');
    await this.auditAdmin(user, {
      room,
      matchId,
      action: 'match.paused',
      summary: `${user.name} pausou a partida.`,
      entityType: 'match',
      entityId: matchId,
      payload: {
        status: 'paused',
      },
    });
    return this.broadcastRoom(room, 'match.status.changed');
  }

  async resumeMatch(user: StoredUser, matchId: string) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    await this.store.updateMatchStatus(matchId, 'live');
    await this.auditAdmin(user, {
      room,
      matchId,
      action: 'match.resumed',
      summary: `${user.name} retomou a partida.`,
      entityType: 'match',
      entityId: matchId,
      payload: {
        status: 'live',
      },
    });
    return this.broadcastRoom(room, 'match.status.changed');
  }

  async endMatch(user: StoredUser, matchId: string) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    await this.store.updateMatchStatus(matchId, 'completed');
    await this.auditAdmin(user, {
      room,
      matchId,
      action: 'match.completed',
      summary: `${user.name} encerrou a partida e fechou o telao.`,
      entityType: 'match',
      entityId: matchId,
      payload: {
        status: 'completed',
        tvPresentation: 'closed',
      },
    });
    return this.broadcastRoom(room, 'match.status.changed');
  }

  async addDraw(user: StoredUser, matchId: string, payload: DrawEntryCommand) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    const match = await this.store.getMatch(matchId);

    if (!match) {
      throw new NotFoundException('Partida nao encontrada.');
    }
    if (match.status !== 'live') {
      throw new BadRequestException(
        'A partida precisa estar ao vivo para registrar sorteios.',
      );
    }

    this.engine.assertValidDraw(payload.letter, payload.value);
    const activeDraws = this.engine.replayActiveDraws(match.drawEvents);
    const display = buildDrawDisplay(payload.letter, payload.value);
    if (this.engine.hasDuplicateActiveDraw(activeDraws, display)) {
      throw new BadRequestException('Numero ja sorteado nesta partida.');
    }

    const draw = await this.store.appendDraw(matchId, {
      ...payload,
      actorUserId: user.id,
    });

    if (!draw) {
      throw new NotFoundException('Partida nao encontrada.');
    }

    await this.auditAdmin(user, {
      room,
      matchId,
      action: 'draw.created',
      summary: `${user.name} registrou ${draw.display}.`,
      entityType: 'draw',
      entityId: draw.id,
      payload: {
        display: draw.display,
        sequence: draw.sequence,
      },
    });

    return this.broadcastRoom(room, 'draw.created');
  }

  async correctDraw(
    user: StoredUser,
    matchId: string,
    drawId: string,
    payload: DrawEntryCommand,
  ) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    const match = await this.store.getMatch(matchId);
    if (!match) {
      throw new NotFoundException('Partida nao encontrada.');
    }

    this.engine.assertValidDraw(payload.letter, payload.value);
    const activeDraws = this.engine.replayActiveDraws(match.drawEvents);
    const target = activeDraws.find((draw) => draw.id === drawId);
    if (!target) {
      throw new NotFoundException('Sorteio alvo nao encontrado.');
    }

    const display = buildDrawDisplay(payload.letter, payload.value);
    if (this.engine.hasDuplicateActiveDraw(activeDraws, display, drawId)) {
      throw new BadRequestException(
        'O numero corrigido entraria duplicado no historico.',
      );
    }

    const draw = await this.store.appendDraw(matchId, {
      ...payload,
      actorUserId: user.id,
      type: 'correction',
      correctedFromId: drawId,
    });

    if (!draw) {
      throw new NotFoundException('Partida nao encontrada.');
    }

    await this.auditAdmin(user, {
      room,
      matchId,
      action: 'draw.corrected',
      summary: `${user.name} corrigiu ${target.display} para ${draw.display}.`,
      entityType: 'draw',
      entityId: draw.id,
      payload: {
        from: target.display,
        to: draw.display,
        correctedFromId: drawId,
        sequence: draw.sequence,
      },
    });

    return this.broadcastRoom(room, 'draw.corrected');
  }

  async revertDraw(user: StoredUser, matchId: string, drawId: string) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    const match = await this.store.getMatch(matchId);
    if (!match) {
      throw new NotFoundException('Partida nao encontrada.');
    }

    const activeDraws = this.engine.replayActiveDraws(match.drawEvents);
    const target = activeDraws.find((draw) => draw.id === drawId);
    if (!target) {
      throw new NotFoundException('Sorteio alvo nao encontrado.');
    }

    const draw = await this.store.appendDraw(matchId, {
      letter: target.letter,
      value: target.value,
      actorUserId: user.id,
      type: 'revert',
      correctedFromId: drawId,
    });

    if (!draw) {
      throw new NotFoundException('Partida nao encontrada.');
    }

    await this.auditAdmin(user, {
      room,
      matchId,
      action: 'draw.reverted',
      summary: `${user.name} reverteu ${target.display}.`,
      entityType: 'draw',
      entityId: draw.id,
      payload: {
        revertedDisplay: target.display,
        correctedFromId: drawId,
        sequence: draw.sequence,
      },
    });

    return this.broadcastRoom(room, 'draw.corrected');
  }

  async replayLast(user: StoredUser, matchId: string) {
    const room = await this.getTenantRoomByMatch(user, matchId);
    const snapshot = await this.snapshotRoom(room);
    await this.auditAdmin(user, {
      room,
      matchId,
      action: 'draw.replayed',
      summary: `${user.name} pediu replay do ultimo sorteio.`,
      entityType: 'match',
      entityId: matchId,
      payload: {
        currentDraw: snapshot.match.currentDraw?.display,
      },
    });
    return {
      room: snapshot,
      replay: snapshot.match.currentDraw,
    };
  }

  async claim(matchId: string, playerToken?: string) {
    const match = await this.store.getMatch(matchId);
    if (!match) {
      throw new NotFoundException('Partida nao encontrada.');
    }

    const room = await this.store.getRoom(match.roomId);
    if (!room) {
      throw new NotFoundException('Sala nao encontrada.');
    }

    const snapshot = await this.snapshotRoom(room);
    const claimant = playerToken
      ? await this.store.getPlayerByToken(playerToken)
      : undefined;
    const winnerEntry = snapshot.match.lastWinner?.winners.find(
      (entry) => entry.playerSessionId === claimant?.id,
    );
    const claimStatus = winnerEntry ? 'confirmed' : 'rejected';
    const claimReason = this.resolveClaimReason({
      claimantFound: Boolean(claimant),
      claimantInRoom: claimant?.roomId === room.id,
      hasWinner: Boolean(snapshot.match.lastWinner),
      winnerMatched: Boolean(winnerEntry),
      tokenProvided: Boolean(playerToken),
    });
    const claim = await this.store.createWinClaim({
      tenantId: room.tenantId,
      roomId: room.id,
      matchId,
      playerSessionId: claimant?.id,
      playerName: claimant?.name,
      roundId: snapshot.match.lastWinner?.roundId,
      cardId: winnerEntry?.cardId,
      triggeredByDrawId: snapshot.match.lastWinner?.triggeredByDrawId,
      status: claimStatus,
      reason: claimReason,
      snapshot: {
        roomCode: room.joinCode,
        currentDraw: snapshot.match.currentDraw?.display,
        winner: snapshot.match.lastWinner,
        tokenProvided: Boolean(playerToken),
      },
    });

    return {
      room: snapshot,
      claimant: claimant
        ? {
            id: claimant.id,
            name: claimant.name,
          }
        : undefined,
      winner: snapshot.match.lastWinner,
      claim,
    };
  }

  async joinRoom(joinCode: string, payload: JoinRoomRequest) {
    const room = await this.store.getRoomByCode(joinCode);
    if (!room) {
      throw new NotFoundException('Sala nao encontrada.');
    }

    const cardsRequested = Math.min(
      Math.max(payload.cardsRequested ?? 1, 1),
      room.maxCardsPerPlayer,
    );

    const player = await this.store.createPlayerSession({
      roomId: room.id,
      name: payload.name,
      avatar: payload.avatar,
      cardsRequested,
    });

    const snapshot = await this.snapshotRoom(room);
    await this.realtimeGateway.emitRoom(
      room.joinCode,
      'player.presence.updated',
      snapshot,
    );

    return {
      playerToken: player.token,
      player: snapshot.match.players.find((entry) => entry.id === player.id)!,
      room: snapshot,
    };
  }

  async getPublicState(joinCode: string) {
    const room = await this.store.getRoomByCode(joinCode);
    if (!room) {
      throw new NotFoundException('Sala nao encontrada.');
    }
    return this.snapshotRoom(room);
  }

  async getTvState(joinCode: string) {
    return this.getPublicState(joinCode);
  }

  async getRoomHistory(
    user: StoredUser,
    roomId: string,
  ): Promise<AdminHistoryResponseDto> {
    const room = await this.getTenantRoom(user, roomId);
    const history = await this.store.getRoomHistory(room.id, room.matchId);

    return {
      roomId: room.id,
      roomName: room.name,
      roomCode: room.joinCode,
      matchId: room.matchId,
      items: history.items,
      auditLogs: history.auditLogs,
      winClaims: history.winClaims,
    };
  }

  private toPrintableCardDto(card: StoredCard): PrintableCardDto {
    const digitalUrl = card.digitalAccessCode
      ? `${this.webBaseUrl.replace(/\/$/, '')}/card/${card.digitalAccessCode}`
      : undefined;

    return {
      id: card.id,
      serial: card.serial,
      cells: card.cells,
      digitalAccessCode: card.digitalAccessCode,
      verificationCode: card.digitalAccessCode,
      digitalUrl,
      qrValue: digitalUrl,
      issuedAt: card.printedAt,
    };
  }

  private async buildAuthResponse(userId: string): Promise<AuthResponseDto> {
    const user = await this.store.getUserById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado.');
    }
    const tenant = await this.store.getTenant(user.tenantId);
    if (!tenant) {
      throw new UnauthorizedException('Tenant nao encontrado.');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });
    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: 'refresh',
      },
      {
        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant,
    };
  }

  private async getTenantRoom(user: StoredUser, roomId: string) {
    const room = await this.store.getRoom(roomId);

    if (!room || room.tenantId !== user.tenantId) {
      throw new NotFoundException('Sala nao encontrada.');
    }

    return room;
  }

  private async getTenantRoomByMatch(user: StoredUser, matchId: string) {
    const match = await this.store.getMatch(matchId);
    if (!match) {
      throw new NotFoundException('Partida nao encontrada.');
    }

    return this.getTenantRoom(user, match.roomId);
  }

  private async auditAdmin(
    user: StoredUser,
    params: {
      room?: StoredRoom;
      matchId?: string;
      action: string;
      summary: string;
      entityType?: string;
      entityId?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    await this.store.appendAuditLog({
      tenantId: user.tenantId,
      roomId: params.room?.id,
      matchId: params.matchId,
      userId: user.id,
      actorType: 'admin',
      actorName: user.name,
      action: params.action,
      summary: params.summary,
      entityType: params.entityType,
      entityId: params.entityId,
      payload: params.payload,
    });
  }

  private resolveClaimReason(params: {
    claimantFound: boolean;
    claimantInRoom: boolean;
    hasWinner: boolean;
    winnerMatched: boolean;
    tokenProvided: boolean;
  }) {
    if (!params.tokenProvided) {
      return 'Pedido recebido sem token de jogador.';
    }
    if (!params.claimantFound) {
      return 'Token de jogador nao encontrado.';
    }
    if (!params.claimantInRoom) {
      return 'Jogador nao pertence a esta sala.';
    }
    if (!params.hasWinner) {
      return 'Nenhum bingo confirmado pelo servidor no momento do pedido.';
    }
    if (!params.winnerMatched) {
      return 'Pedido nao corresponde ao vencedor atual da rodada.';
    }
    return 'Bingo confirmado pelo servidor.';
  }

  private buildTemporaryPassword() {
    return `Bingo-${createId(10)}`;
  }

  private async snapshotRoom(room: StoredRoom): Promise<RoomSnapshot> {
    const [tenant, match, players] = await Promise.all([
      this.store.getTenant(room.tenantId),
      this.store.getMatch(room.matchId),
      this.store.getPlayersForRoom(room.id),
    ]);

    if (!tenant || !match) {
      throw new NotFoundException('Projecao da sala indisponivel.');
    }

    return this.engine.buildRoomSnapshot({
      room,
      match,
      tenant,
      players,
      webBaseUrl: this.webBaseUrl,
    });
  }

  private async broadcastRoom(room: StoredRoom, event: string) {
    const snapshot = await this.snapshotRoom(room);
    await this.realtimeGateway.emitRoom(room.joinCode, event, snapshot);
    await this.realtimeGateway.emitRoom(
      room.joinCode,
      'room.snapshot',
      snapshot,
    );
    await this.redisBridge.publish(`room:${room.joinCode}`, {
      event,
      room: snapshot,
    });
    await this.analyticsQueue.enqueueRoomAnalytics(room.id, event);

    if (
      snapshot.match.lastWinner?.triggeredByDrawId ===
      snapshot.match.currentDraw?.id
    ) {
      await this.realtimeGateway.emitRoom(
        room.joinCode,
        'winner.detected',
        snapshot.match.lastWinner,
      );
      await this.realtimeGateway.emitRoom(
        room.joinCode,
        'winner.confirmed',
        snapshot.match.lastWinner,
      );
    }

    return {
      room: snapshot,
    };
  }
}
