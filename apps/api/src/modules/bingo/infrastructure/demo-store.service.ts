import { Injectable } from '@nestjs/common';
import { hashSync } from 'bcryptjs';
import type {
  BingoLetter,
  CreateRoomRequest,
  DrawEntryCommand,
  MatchStatus,
  PrizeRoundConfig,
} from '@bingo/contracts';
import { BingoCardFactory } from '../domain/bingo-card.factory';
import { createId } from '../domain/create-id';
import { buildDrawDisplay } from '../domain/bingo-rules';
import type {
  InvitePayload,
  StoredDrawEvent,
  StoredMatch,
  StoredPlayerSession,
  StoredRoom,
  StoredTenant,
  StoredUser,
} from '../domain/internal-types';

@Injectable()
export class DemoStoreService {
  tenants: StoredTenant[] = [];
  users: StoredUser[] = [];
  rooms: StoredRoom[] = [];
  matches: StoredMatch[] = [];
  playerSessions: StoredPlayerSession[] = [];

  constructor(private readonly cardFactory: BingoCardFactory) {
    this.seed();
  }

  getUserByEmail(email: string) {
    return this.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(userId: string) {
    return this.users.find((user) => user.id === userId);
  }

  getTenant(tenantId: string) {
    return this.tenants.find((tenant) => tenant.id === tenantId);
  }

  getRoom(roomId: string) {
    return this.rooms.find((room) => room.id === roomId);
  }

  getRoomByCode(joinCode: string) {
    return this.rooms.find((room) => room.joinCode.toLowerCase() === joinCode.toLowerCase());
  }

  getRoomsForTenant(tenantId: string) {
    return this.rooms.filter((room) => room.tenantId === tenantId);
  }

  getMatch(matchId: string) {
    return this.matches.find((match) => match.id === matchId);
  }

  getPlayersForRoom(roomId: string) {
    return this.playerSessions.filter((player) => player.roomId === roomId);
  }

  getPlayerByToken(token: string) {
    return this.playerSessions.find((player) => player.token === token);
  }

  createTenant(params: {
    tenantName: string;
    slug: string;
    ownerName: string;
    ownerEmail: string;
    password: string;
  }) {
    const tenant: StoredTenant = {
      id: createId(),
      name: params.tenantName,
      slug: params.slug,
      createdAt: new Date().toISOString(),
    };

    const owner = this.createUser({
      tenantId: tenant.id,
      name: params.ownerName,
      email: params.ownerEmail,
      password: params.password,
      role: 'owner',
    });

    const room = this.createRoom(tenant.id, {
      name: 'Sala Principal',
      theme: 'cassino',
      maxCardsPerPlayer: 3,
      allowAutoMark: true,
      allowManualMark: true,
    });

    this.tenants.push(tenant);

    return {
      tenant,
      owner,
      room,
    };
  }

  createUser(params: {
    tenantId: string;
    name: string;
    email: string;
    password: string;
    role: InvitePayload['role'];
  }) {
    const user: StoredUser = {
      id: createId(),
      tenantId: params.tenantId,
      name: params.name,
      email: params.email,
      passwordHash: hashSync(params.password, 10),
      role: params.role,
      createdAt: new Date().toISOString(),
    };

    this.users.push(user);
    return user;
  }

  inviteMember(tenantId: string, payload: InvitePayload) {
    return this.createUser({
      tenantId,
      name: payload.name,
      email: payload.email,
      password: payload.password ?? 'bingo123',
      role: payload.role,
    });
  }

  createRoom(tenantId: string, payload: CreateRoomRequest) {
    const matchId = createId();
    const room: StoredRoom = {
      id: createId(),
      tenantId,
      name: payload.name,
      joinCode: this.generateJoinCode(),
      theme: payload.theme,
      allowAutoMark: payload.allowAutoMark,
      allowManualMark: payload.allowManualMark,
      maxCardsPerPlayer: payload.maxCardsPerPlayer,
      createdAt: new Date().toISOString(),
      matchId,
    };

    const match: StoredMatch = {
      id: matchId,
      roomId: room.id,
      status: 'draft',
      prizeRounds: this.createDefaultPrizeRounds(),
      drawEvents: [],
    };

    this.rooms.push(room);
    this.matches.push(match);

    return room;
  }

  updateRoom(roomId: string, patch: Partial<Omit<StoredRoom, 'id' | 'tenantId' | 'matchId'>>) {
    const room = this.getRoom(roomId);
    if (!room) {
      return undefined;
    }

    Object.assign(room, patch);
    return room;
  }

  updateMatchStatus(matchId: string, status: MatchStatus) {
    const match = this.getMatch(matchId);
    if (!match) {
      return undefined;
    }

    match.status = status;

    if (status === 'live') {
      match.startedAt ??= new Date().toISOString();
      match.pausedAt = undefined;
    }

    if (status === 'paused') {
      match.pausedAt = new Date().toISOString();
    }

    if (status === 'completed') {
      match.endedAt = new Date().toISOString();
    }

    return match;
  }

  appendDraw(
    matchId: string,
    payload: DrawEntryCommand & {
      actorUserId?: string;
      type?: StoredDrawEvent['type'];
      correctedFromId?: string;
    },
  ) {
    const match = this.getMatch(matchId);
    if (!match) {
      return undefined;
    }

    const event: StoredDrawEvent = {
      id: createId(),
      matchId,
      letter: payload.letter,
      value: payload.value,
      display: buildDrawDisplay(payload.letter, payload.value),
      type: payload.type ?? 'draw',
      sequence: match.drawEvents.length + 1,
      createdAt: new Date().toISOString(),
      correctedFromId: payload.correctedFromId,
      actorUserId: payload.actorUserId,
    };

    match.drawEvents.push(event);
    return event;
  }

  createPlayerSession(params: {
    roomId: string;
    name: string;
    avatar?: string;
    cardsRequested: number;
  }) {
    const existingSerials = new Set(
      this.playerSessions.flatMap((session) => session.cards).map((card) => card.serial),
    );

    const player: StoredPlayerSession = {
      id: createId(),
      roomId: params.roomId,
      name: params.name,
      avatar: params.avatar ?? this.pickAvatar(),
      token: `room_${createId(10)}`,
      autoMark: true,
      cards: this.cardFactory.generateCards(params.cardsRequested, existingSerials),
      createdAt: new Date().toISOString(),
    };

    this.playerSessions.push(player);
    return player;
  }

  seed() {
    const tenant: StoredTenant = {
      id: createId(),
      name: 'Bingo Familiar Premium',
      slug: 'bingo-familiar-premium',
      createdAt: new Date().toISOString(),
    };
    this.tenants.push(tenant);

    const owner = this.createUser({
      tenantId: tenant.id,
      name: 'Ana Mestre de Cerimonia',
      email: 'admin@bingo.local',
      password: 'bingo123',
      role: 'owner',
    });

    this.createUser({
      tenantId: tenant.id,
      name: 'Operador Telao',
      email: 'operador@bingo.local',
      password: 'bingo123',
      role: 'operator',
    });

    const room = this.createRoom(tenant.id, {
      name: 'Natal em Familia 2026',
      theme: 'natal',
      maxCardsPerPlayer: 3,
      allowAutoMark: true,
      allowManualMark: true,
    });

    const match = this.getMatch(room.matchId)!;
    match.status = 'live';
    match.startedAt = new Date().toISOString();

    const players = [
      ['Joao', 'JS'],
      ['Maria', 'MA'],
      ['Paulo', 'PA'],
      ['Lia', 'LI'],
      ['Carla', 'CA'],
      ['Rafa', 'RA'],
      ['Tati', 'TA'],
      ['Beto', 'BE'],
    ] as const;

    for (const [name, avatar] of players) {
      this.createPlayerSession({
        roomId: room.id,
        name,
        avatar,
        cardsRequested: name === 'Maria' ? 2 : 1,
      });
    }

    const roomPlayers = this.getPlayersForRoom(room.id);
    const curatedDraws = this.buildCuratedDemoDraws(roomPlayers);

    for (const [letter, value] of curatedDraws) {
      this.appendDraw(match.id, {
        letter,
        value,
        actorUserId: owner.id,
      });
    }
  }

  private createDefaultPrizeRounds(): PrizeRoundConfig[] {
    return [
      {
        id: createId(),
        label: '1 Linha',
        pattern: 'single_line',
        order: 1,
        prize: 'Caixa surpresa premium',
      },
      {
        id: createId(),
        label: '2 Linhas',
        pattern: 'double_line',
        order: 2,
        prize: 'Cesta comemorativa',
      },
      {
        id: createId(),
        label: 'Cartela Cheia',
        pattern: 'full_house',
        order: 3,
        prize: 'Super premio da noite',
      },
    ];
  }

  private generateJoinCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  private pickAvatar() {
    const avatars = ['AV', 'BJ', 'CR', 'DL', 'EM', 'FN', 'GO', 'HP'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }

  private buildCuratedDemoDraws(players: StoredPlayerSession[]) {
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

    firstCard?.cells[0].slice(0, 4).forEach((cell) => pushValue(cell.letter, cell.value));
    firstCard?.cells[1].slice(0, 3).forEach((cell) => pushValue(cell.letter, cell.value));
    secondCard?.cells[3].slice(0, 4).forEach((cell) => pushValue(cell.letter, cell.value));

    chosen.push(['G', 52], ['O', 70]);

    return chosen.slice(0, 12);
  }
}
