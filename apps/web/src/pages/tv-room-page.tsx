import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, GlassPanel } from '@bingo/ui';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { CelebrationLayer } from '@/components/celebration-layer';
import { DrawSpotlight } from '@/components/draw-spotlight';
import { LoadingState } from '@/components/loading-state';
import { ProximityTicker } from '@/components/proximity-ticker';
import { QRJoinPanel } from '@/components/qr-join-panel';
import { RankingRail } from '@/components/ranking-rail';
import { RecentDrawsRail } from '@/components/recent-draws-rail';
import { WinnerOverlay } from '@/components/winner-overlay';
import { api } from '@/lib/api';
import { useRoomChannel } from '@/hooks/use-room-channel';
import { useSpeechAnnouncer } from '@/hooks/use-speech-announcer';
import { useThemeShell } from '@/hooks/use-theme-shell';

export function TvRoomPage() {
  const { roomCode } = useParams();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const loader = useMemo(
    () => (roomCode ? () => api.getTvState(roomCode) : undefined),
    [roomCode],
  );
  const { room, loading } = useRoomChannel(roomCode, loader);

  useThemeShell(room?.theme, false);
  useSpeechAnnouncer(room?.match.announcements ?? [], voiceEnabled);

  if (loading || !room) {
    return <LoadingState label="Carregando modo TV" />;
  }

  return (
    <main className="noise-layer min-h-screen px-6 py-6">
      <CelebrationLayer winnerKey={room.match.lastWinner?.triggeredByDrawId} />
      <WinnerOverlay
        winner={room.match.lastWinner}
        currentDraw={room.match.currentDraw?.display}
      />

      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1600px] gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <section className="space-y-5">
          <GlassPanel className="rounded-[34px] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="m-0 text-[0.72rem] uppercase tracking-[0.3em] text-[var(--muted-text)]">
                  Modo TV / Telão
                </p>
                <h1 className="m-0 mt-2 font-display text-4xl text-gradient">{room.roomName}</h1>
              </div>
              <Button variant="secondary" onClick={() => void document.documentElement.requestFullscreen?.()}>
                Tela cheia
              </Button>
            </div>
          </GlassPanel>

          <DrawSpotlight draw={room.match.currentDraw} large />
          <AnnouncementBanner cues={room.match.announcements} />

          <GlassPanel className="space-y-4 rounded-[30px] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="m-0 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--muted-text)]">
                  Ultimos sorteios
                </p>
                <p className="m-0 mt-1 text-sm text-[var(--muted-text)]">
                  Fluxo atualizado para projetor, Smart TV e auditório.
                </p>
              </div>
              <Button variant="ghost" onClick={() => setVoiceEnabled((current) => !current)}>
                Narrador {voiceEnabled ? 'ligado' : 'desligado'}
              </Button>
            </div>
            <RecentDrawsRail draws={room.match.recentDraws} />
          </GlassPanel>
        </section>

        <aside className="grid gap-5">
          <QRJoinPanel room={room} />
          <RankingRail entries={room.match.proximityBoard} />
          <ProximityTicker entries={room.match.proximityBoard.slice(0, 4)} />
        </aside>
      </div>
    </main>
  );
}
