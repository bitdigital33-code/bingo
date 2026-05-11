import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button, GlassPanel } from '@bingo/ui';
import type { BingoCellDto } from '@bingo/contracts';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { AutoMarkToggle } from '@/components/auto-mark-toggle';
import { BingoCardGrid } from '@/components/bingo-card-grid';
import { CelebrationLayer } from '@/components/celebration-layer';
import { DrawSpotlight } from '@/components/draw-spotlight';
import { LoadingState } from '@/components/loading-state';
import { RecentDrawsRail } from '@/components/recent-draws-rail';
import { WinnerOverlay } from '@/components/winner-overlay';
import { api } from '@/lib/api';
import {
  loadManualMarks,
  loadPlayerIdentity,
  saveManualMarks,
} from '@/lib/session';
import {
  buildCellKey,
  canToggleManualCell,
  projectManualCard,
  seedManualMarksFromDraws,
  type ManualMarksState,
} from '@/lib/manual-card';
import { useRoomChannel } from '@/hooks/use-room-channel';
import { useThemeShell } from '@/hooks/use-theme-shell';

export function PlayerRoomPage() {
  const { roomCode } = useParams();
  const identity = roomCode ? loadPlayerIdentity(roomCode) : undefined;
  const [autoMark, setAutoMark] = useState(true);
  const [manualMarks, setManualMarks] = useState<ManualMarksState>(() =>
    roomCode && identity ? loadManualMarks(roomCode, identity.playerId) : {},
  );
  const loader = useMemo(
    () => (roomCode ? () => api.getRoomState(roomCode) : undefined),
    [roomCode],
  );
  const { room, loading } = useRoomChannel(roomCode, loader);

  useThemeShell(room?.theme, false);

  if (!roomCode || !identity) {
    return <Navigate to={`/join/${roomCode ?? ''}`} replace />;
  }

  if (loading || !room) {
    return <LoadingState label="Sincronizando cartelas" />;
  }

  const player = room.match.players.find((entry) => entry.id === identity.playerId);
  if (!player) {
    return <Navigate to={`/join/${roomCode}`} replace />;
  }

  const currentRoomCode = roomCode;
  const currentIdentity = identity;
  const currentPlayer = player;
  const activePattern =
    room.match.prizeRounds.find((entry) => entry.id === room.match.currentPrizeRoundId)?.pattern ??
    'full_house';
  const visibleCards = player.cards.map((card) =>
    autoMark ? { ...card, autoMark: true } : projectManualCard(card, manualMarks[card.id], activePattern),
  );
  const canClaim = visibleCards.some((card) => card.marksNeeded === 0);

  function updateManualMarks(updater: (current: ManualMarksState) => ManualMarksState) {
    setManualMarks((current) => {
      const next = updater(current);
      saveManualMarks(currentRoomCode, currentIdentity.playerId, next);
      return next;
    });
  }

  function handleAutoMarkChange(nextAutoMark: boolean) {
    if (!nextAutoMark) {
      updateManualMarks((current) => seedManualMarksFromDraws(currentPlayer.cards, current));
    }

    setAutoMark(nextAutoMark);
  }

  function handleManualCellToggle(cardId: string, cell: BingoCellDto) {
    const sourceCell = currentPlayer.cards
      .find((card) => card.id === cardId)
      ?.cells[cell.row]?.[cell.col];

    if (!sourceCell || !canToggleManualCell(sourceCell)) {
      return;
    }

    const key = buildCellKey(cell.row, cell.col);
    updateManualMarks((current) => {
      const marks = new Set(current[cardId] ?? []);

      if (marks.has(key)) {
        marks.delete(key);
      } else {
        marks.add(key);
      }

      return {
        ...current,
        [cardId]: [...marks],
      };
    });
  }

  function isManualCellToggleable(cardId: string, cell: BingoCellDto) {
    const sourceCell = currentPlayer.cards
      .find((card) => card.id === cardId)
      ?.cells[cell.row]?.[cell.col];

    return sourceCell ? canToggleManualCell(sourceCell) : false;
  }

  return (
    <main className="noise-layer min-h-screen px-4 py-5 md:px-6">
      <CelebrationLayer winnerKey={room.match.lastWinner?.triggeredByDrawId} />
      <WinnerOverlay
        winner={room.match.lastWinner}
        currentDraw={room.match.currentDraw?.display}
      />

      <div className="mx-auto max-w-4xl space-y-5">
        <GlassPanel className="rounded-[34px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="m-0 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--muted-text)]">
                Jogador
              </p>
              <h1 className="m-0 mt-2 font-display text-3xl text-[var(--text-color)]">
                {player.avatar} {player.name}
              </h1>
            </div>
            <AutoMarkToggle autoMark={autoMark} onChange={handleAutoMarkChange} />
          </div>
        </GlassPanel>

        <DrawSpotlight draw={room.match.currentDraw} />
        <AnnouncementBanner cues={room.match.announcements} />

        {player.cards.some((card) => card.marksNeeded <= 2) ? (
          <GlassPanel className="rounded-[30px] border-white/5 bg-[linear-gradient(135deg,rgba(255,122,89,0.22),rgba(89,255,208,0.14))] p-5">
            <p className="m-0 font-display text-2xl text-[var(--text-color)]">Quase bingo!</p>
            <p className="m-0 mt-2 text-sm text-[var(--muted-text)]">
              Você entrou na zona quente. Fique de olho no próximo sorteio.
            </p>
          </GlassPanel>
        ) : null}

        <div className="space-y-4">
          {visibleCards.map((card) => (
            <BingoCardGrid
              key={card.id}
              card={card}
              isCellToggleable={(cell) => isManualCellToggleable(card.id, cell)}
              large
              onCellToggle={(cell) => handleManualCellToggle(card.id, cell)}
            />
          ))}
        </div>

        <GlassPanel className="space-y-4 rounded-[30px] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="m-0 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--muted-text)]">
                Historico recente
              </p>
              <p className="m-0 mt-1 text-sm text-[var(--muted-text)]">
                Acompanhe os ultimos numeros sorteados em tempo real.
              </p>
            </div>
            <Button
              disabled={!canClaim}
              className="whitespace-nowrap"
              onClick={() => void api.claim(room.match.matchId, identity.playerToken)}
            >
              Chamar Bingo
            </Button>
          </div>
          <RecentDrawsRail draws={room.match.recentDraws} />
        </GlassPanel>
      </div>
    </main>
  );
}
