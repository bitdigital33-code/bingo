import { Injectable } from '@nestjs/common';
import type {
  AnnouncementCue,
  BingoCellDto,
  DrawEventDto,
  MatchSnapshot,
  PlayerCardView,
  PlayerSessionDto,
  PrizePattern,
  PrizeShowcaseDto,
  ProximityEntry,
  RoomSnapshot,
  StageMomentDto,
  WinnerResult,
} from '@bingo/contracts';
import {
  buildDrawDisplay,
  countMissingForPattern,
  FREE_CENTER,
  isValidDraw,
} from './bingo-rules';
import type {
  StoredCard,
  StoredDrawEvent,
  StoredMatch,
  StoredPlayerSession,
  StoredRoom,
  StoredTenant,
} from './internal-types';

@Injectable()
export class BingoEngineService {
  assertValidDraw(letter: DrawEventDto['letter'], value: number) {
    if (!isValidDraw(letter, value)) {
      throw new Error(`Sorteio invalido para ${letter}${value}`);
    }
  }

  replayActiveDraws(events: StoredDrawEvent[]) {
    const active = new Map<string, StoredDrawEvent>();

    for (const event of [...events].sort(
      (left, right) => left.sequence - right.sequence,
    )) {
      if (event.type === 'draw') {
        active.set(event.id, event);
        continue;
      }

      if (event.correctedFromId) {
        active.delete(event.correctedFromId);
      }

      if (event.type === 'correction') {
        active.set(event.id, event);
      }
    }

    return [...active.values()].sort(
      (left, right) => left.sequence - right.sequence,
    );
  }

  buildRoomSnapshot(params: {
    room: StoredRoom;
    match: StoredMatch;
    tenant: StoredTenant;
    players: StoredPlayerSession[];
    webBaseUrl: string;
  }): RoomSnapshot {
    const { room, match, tenant, players, webBaseUrl } = params;
    const activeDraws = this.replayActiveDraws(match.drawEvents);
    const projection = this.resolveRounds(match, players, activeDraws);
    const activeRound = projection.activeRound;
    const prizeShowcase = this.buildPrizeShowcase({
      ...match,
      prizeRounds: projection.prizeRounds,
    });
    const stageMoment = this.buildStageMoment(match);
    const drawnSet = new Set(activeDraws.map((draw) => draw.display));
    const playersView = players.map((player) =>
      this.toPlayerSessionView(
        player,
        drawnSet,
        activeRound?.pattern ?? 'full_house',
        activeRound?.targetMarks,
      ),
    );
    const proximityBoard = this.buildProximityBoard(
      players,
      drawnSet,
      activeRound?.pattern,
      activeRound?.targetMarks,
    );
    const currentDraw = activeDraws.at(-1);
    const announcements = this.buildAnnouncements(
      currentDraw,
      proximityBoard,
      projection.lastWinner,
    );
    const tvStandby = this.shouldUseTvStandby({
      match,
      currentDraw,
      prizeShowcaseVisible: Boolean(prizeShowcase),
      stageMomentVisible: Boolean(stageMoment),
      recentDrawsVisible: match.recentDrawsVisible,
    });

    const status =
      projection.allRoundsCompleted && match.status !== 'draft'
        ? 'completed'
        : match.status;

    const matchSnapshot: MatchSnapshot = {
      matchId: match.id,
      status,
      roomId: room.id,
      roomCode: room.joinCode,
      roomName: room.name,
      tenantName: tenant.name,
      activeTheme: room.theme,
      currentPrizeRoundId:
        activeRound?.id ?? match.prizeRounds.at(-1)?.id ?? '',
      prizeRounds: projection.prizeRounds,
      prizeShowcase,
      stageMoment,
      recentDrawsVisible: match.recentDrawsVisible,
      tvStandby,
      currentDraw,
      recentDraws: activeDraws.slice(-10).reverse(),
      drawnNumbers: activeDraws.map((draw) => ({
        letter: draw.letter,
        value: draw.value,
        display: draw.display,
      })),
      playersOnline: players.length,
      players: playersView,
      proximityBoard,
      announcements,
      lastWinner: projection.lastWinner,
      startedAt: match.startedAt,
      pausedAt: match.pausedAt,
      endedAt: match.endedAt,
    };

    return {
      roomId: room.id,
      roomCode: room.joinCode,
      roomName: room.name,
      joinUrl: `${webBaseUrl.replace(/\/$/, '')}/join/${room.joinCode}`,
      qrValue: `${webBaseUrl.replace(/\/$/, '')}/join/${room.joinCode}`,
      theme: room.theme,
      allowAutoMark: room.allowAutoMark,
      allowManualMark: room.allowManualMark,
      maxCardsPerPlayer: room.maxCardsPerPlayer,
      match: matchSnapshot,
    };
  }

  hasDuplicateActiveDraw(
    activeDraws: StoredDrawEvent[],
    display: string,
    ignoredDrawId?: string,
  ) {
    return activeDraws.some(
      (draw) => draw.display === display && draw.id !== ignoredDrawId,
    );
  }

  private resolveRounds(
    match: StoredMatch,
    players: StoredPlayerSession[],
    activeDraws: StoredDrawEvent[],
  ) {
    const completed = new Map<
      string,
      {
        completedAt: string;
        winner: WinnerResult;
      }
    >();

    const drawnSet = new Set<string>();
    let roundIndex = 0;
    let lastWinner: WinnerResult | undefined;

    for (const draw of activeDraws) {
      drawnSet.add(draw.display);

      while (roundIndex < match.prizeRounds.length) {
        const round = match.prizeRounds[roundIndex];
        const winners = this.findWinners(
          players,
          drawnSet,
          round.pattern,
          round.targetMarks,
        );

        if (winners.length === 0) {
          break;
        }

        lastWinner = {
          roundId: round.id,
          pattern: round.pattern,
          winners,
          triggeredByDrawId: draw.id,
        };

        completed.set(round.id, {
          completedAt: draw.createdAt,
          winner: lastWinner,
        });
        roundIndex += 1;
      }
    }

    const prizeRounds = match.prizeRounds.map((round) => ({
      ...round,
      completedAt: completed.get(round.id)?.completedAt,
    }));

    return {
      prizeRounds,
      lastWinner,
      activeRound: prizeRounds.find((round) => !round.completedAt),
      allRoundsCompleted:
        prizeRounds.length > 0 &&
        prizeRounds.every((round) => round.completedAt),
    };
  }

  private buildPrizeShowcase(match: StoredMatch): PrizeShowcaseDto | undefined {
    if (!match.prizeShowcaseVisible || !match.featuredPrizeRoundId) {
      return undefined;
    }

    const round = match.prizeRounds.find(
      (entry) => entry.id === match.featuredPrizeRoundId,
    );
    if (!round) {
      return undefined;
    }

    return {
      visible: true,
      roundId: round.id,
      label: round.label,
      pattern: round.pattern,
      targetMarks: round.targetMarks,
      order: round.order,
      prize: round.prize,
      completedAt: round.completedAt,
    };
  }

  private buildStageMoment(match: StoredMatch): StageMomentDto | undefined {
    if (
      !match.stageMomentVisible ||
      !match.stageMomentKey ||
      !match.stageMomentTitle ||
      !match.stageMomentMessage
    ) {
      return undefined;
    }

    if (
      match.stageMomentExpiresAt &&
      new Date(match.stageMomentExpiresAt).getTime() <= Date.now()
    ) {
      return undefined;
    }

    return {
      visible: true,
      key: match.stageMomentKey,
      title: match.stageMomentTitle,
      message: match.stageMomentMessage,
      expiresAt: match.stageMomentExpiresAt,
    };
  }

  private shouldUseTvStandby(params: {
    match: StoredMatch;
    currentDraw: StoredDrawEvent | undefined;
    prizeShowcaseVisible: boolean;
    stageMomentVisible: boolean;
    recentDrawsVisible: boolean;
  }) {
    const {
      match,
      currentDraw,
      prizeShowcaseVisible,
      stageMomentVisible,
      recentDrawsVisible,
    } = params;

    if (
      prizeShowcaseVisible ||
      stageMomentVisible ||
      recentDrawsVisible ||
      !match.tvResetAt
    ) {
      return false;
    }

    if (!currentDraw) {
      return true;
    }

    return (
      new Date(currentDraw.createdAt).getTime() <=
      new Date(match.tvResetAt).getTime()
    );
  }

  private findWinners(
    players: StoredPlayerSession[],
    drawnSet: Set<string>,
    pattern: PrizePattern,
    targetMarks?: number,
  ): WinnerResult['winners'] {
    const winners: WinnerResult['winners'] = [];

    for (const player of players) {
      for (const card of player.cards) {
        if (
          this.calculateMarksNeeded(card, drawnSet, pattern, targetMarks) === 0
        ) {
          winners.push({
            playerSessionId: player.id,
            playerName: player.name,
            avatar: player.avatar,
            cardId: card.id,
          });
        }
      }
    }

    return winners;
  }

  private toPlayerSessionView(
    player: StoredPlayerSession,
    drawnSet: Set<string>,
    activePattern: PrizePattern,
    targetMarks?: number,
  ): PlayerSessionDto {
    const cards = player.cards.map((card) =>
      this.toPlayerCardView(card, drawnSet, activePattern, player, targetMarks),
    );

    return {
      id: player.id,
      roomId: player.roomId,
      name: player.name,
      avatar: player.avatar,
      cards,
    };
  }

  private toPlayerCardView(
    card: StoredCard,
    drawnSet: Set<string>,
    activePattern: PrizePattern,
    player: StoredPlayerSession,
    targetMarks?: number,
  ): PlayerCardView {
    const cells: BingoCellDto[][] = card.cells.map((row) =>
      row.map((cell) => ({
        ...cell,
        marked:
          cell.value === 'FREE' ||
          drawnSet.has(buildDrawDisplay(cell.letter, Number(cell.value))),
      })),
    );

    return {
      id: card.id,
      playerSessionId: player.id,
      autoMark: player.autoMark,
      serial: card.serial,
      cells,
      marksNeeded: this.calculateMarksNeeded(
        card,
        drawnSet,
        activePattern,
        targetMarks,
      ),
    };
  }

  private buildProximityBoard(
    players: StoredPlayerSession[],
    drawnSet: Set<string>,
    activePattern: PrizePattern | undefined,
    targetMarks?: number,
  ) {
    if (!activePattern) {
      return [] as ProximityEntry[];
    }

    return players
      .map((player) => {
        const distances = player.cards.map((card) =>
          this.calculateMarksNeeded(card, drawnSet, activePattern, targetMarks),
        );
        const best = Math.min(...distances);
        const cardsNearWin = distances.filter(
          (distance) => distance <= 2,
        ).length;

        return {
          playerSessionId: player.id,
          playerName: player.name,
          avatar: player.avatar,
          cardsNearWin,
          distance: Math.min(best, 3) as 0 | 1 | 2 | 3,
          message: this.buildProximityMessage(best, cardsNearWin),
        };
      })
      .sort((left, right) => {
        if (left.distance !== right.distance) {
          return left.distance - right.distance;
        }

        if (left.cardsNearWin !== right.cardsNearWin) {
          return right.cardsNearWin - left.cardsNearWin;
        }

        return left.playerName.localeCompare(right.playerName);
      })
      .slice(0, 6);
  }

  private buildAnnouncements(
    currentDraw: StoredDrawEvent | undefined,
    proximityBoard: ProximityEntry[],
    winner: WinnerResult | undefined,
  ) {
    const announcements: AnnouncementCue[] = [];

    if (winner && currentDraw && winner.triggeredByDrawId === currentDraw.id) {
      const names = winner.winners.map((entry) => entry.playerName).join(', ');
      announcements.push({
        id: `winner-${winner.roundId}`,
        tone: 'winner',
        message: `Bingo confirmado: ${names}!`,
        speechText: `Temos campeao! ${names} venceu a rodada.`,
        sound: 'winner',
      });
    }

    const leader = proximityBoard[0];
    if (leader) {
      announcements.push({
        id: `hype-${leader.playerSessionId}`,
        tone: leader.distance <= 1 ? 'warning' : 'hype',
        message: leader.message,
        speechText: leader.message,
        sound: leader.distance <= 1 ? 'alert' : 'spark',
      });
    }

    if (proximityBoard.filter((entry) => entry.distance <= 1).length >= 3) {
      announcements.push({
        id: 'crowd-rush',
        tone: 'hype',
        message: 'Disputa acirrada! Temos varios jogadores quase ganhando!',
        speechText:
          'Disputa acirrada! Tem muita gente quase fechando a cartela.',
        sound: 'spark',
      });
    }

    return announcements.slice(0, 3);
  }

  private buildProximityMessage(distance: number, cardsNearWin: number) {
    if (distance === 0) {
      return 'Uma cartela bateu o padrao da rodada!';
    }
    if (distance === 1) {
      return 'Falta 1 numero para uma cartela bater!';
    }
    if (distance === 2) {
      return 'Faltam 2 numeros para uma cartela bater!';
    }
    if (cardsNearWin > 0) {
      return cardsNearWin === 1
        ? '1 cartela na boa, chegando perto do bingo!'
        : `${cardsNearWin} cartelas na boa, chegando perto do bingo!`;
    }
    return 'Uma cartela segue no jogo e pode surpreender a qualquer momento!';
  }

  private calculateMarksNeeded(
    card: StoredCard,
    drawnSet: Set<string>,
    pattern: PrizePattern,
    targetMarks?: number,
  ) {
    const marks = card.cells.map((row) =>
      row.map(
        (cell) =>
          cell.value === 'FREE' ||
          (typeof cell.value === 'number' &&
            drawnSet.has(buildDrawDisplay(cell.letter, cell.value))),
      ),
    );
    marks[FREE_CENTER.row][FREE_CENTER.col] = true;
    return countMissingForPattern(marks, pattern, targetMarks);
  }
}
