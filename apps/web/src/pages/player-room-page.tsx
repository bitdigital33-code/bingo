import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button, GlassPanel } from '@bingo/ui';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { AutoMarkToggle } from '@/components/auto-mark-toggle';
import { BingoCardGrid } from '@/components/bingo-card-grid';
import { CelebrationLayer } from '@/components/celebration-layer';
import { DrawSpotlight } from '@/components/draw-spotlight';
import { LoadingState } from '@/components/loading-state';
import { RecentDrawsRail } from '@/components/recent-draws-rail';
import { WinnerOverlay } from '@/components/winner-overlay';
import { api } from '@/lib/api';
import { loadPlayerIdentity } from '@/lib/session';
import { useRoomChannel } from '@/hooks/use-room-channel';
import { useThemeShell } from '@/hooks/use-theme-shell';

export function PlayerRoomPage() {
  const { roomCode } = useParams();
  const identity = roomCode ? loadPlayerIdentity(roomCode) : undefined;
  const [autoMark, setAutoMark] = useState(true);
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

  const canClaim = player.cards.some((card) => card.marksNeeded === 0);

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
            <AutoMarkToggle autoMark={autoMark} onChange={setAutoMark} />
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
          {player.cards.map((card) => (
            <BingoCardGrid key={card.id} card={{ ...card, autoMark }} large />
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
