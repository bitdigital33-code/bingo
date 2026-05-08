import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { RoomSnapshot, ThemeKey } from '@bingo/contracts';
import { Button, GlassPanel } from '@bingo/ui';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { CelebrationLayer } from '@/components/celebration-layer';
import { DrawSpotlight } from '@/components/draw-spotlight';
import { HighContrastToggle } from '@/components/high-contrast-toggle';
import { LoadingState } from '@/components/loading-state';
import { ManualDrawPad } from '@/components/manual-draw-pad';
import { ProximityTicker } from '@/components/proximity-ticker';
import { QRJoinPanel } from '@/components/qr-join-panel';
import { RankingRail } from '@/components/ranking-rail';
import { RecentDrawsRail } from '@/components/recent-draws-rail';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { WinnerOverlay } from '@/components/winner-overlay';
import { api } from '@/lib/api';
import { clearAuth, loadAuth } from '@/lib/session';
import { useRoomChannel } from '@/hooks/use-room-channel';
import { useSpeechAnnouncer } from '@/hooks/use-speech-announcer';
import { useThemeShell } from '@/hooks/use-theme-shell';

export function AdminDashboardPage() {
  const auth = useMemo(() => loadAuth(), []);
  const [rooms, setRooms] = useState<RoomSnapshot[]>([]);
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>();
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!auth) {
      return;
    }

    setBootstrapLoading(true);
    void api
      .bootstrap(auth.accessToken)
      .then((data) => {
        setRooms(data.rooms);
        setSelectedRoomCode((current) => current ?? data.rooms[0]?.roomCode);
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : 'Falha ao carregar o painel.');
      })
      .finally(() => setBootstrapLoading(false));
  }, [auth]);

  const loader = useMemo(
    () => (selectedRoomCode ? () => api.getRoomState(selectedRoomCode) : undefined),
    [selectedRoomCode],
  );
  const { room, loading } = useRoomChannel(selectedRoomCode, loader);
  const bootstrapRoom = rooms.find((entry) => entry.roomCode === selectedRoomCode);
  const activeRoom = room ?? bootstrapRoom;
  const deferredProximity = useDeferredValue(activeRoom?.match.proximityBoard ?? []);

  useThemeShell(activeRoom?.theme, highContrast);
  useSpeechAnnouncer(activeRoom?.match.announcements ?? [], soundEnabled);

  useEffect(() => {
    if (!room) {
      return;
    }

    setRooms((current) => {
      const next = current.slice();
      const index = next.findIndex((entry) => entry.roomId === room.roomId);
      if (index >= 0) {
        next[index] = room;
      }
      return next;
    });
  }, [room]);

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  const session = auth;

  if (bootstrapLoading || (!activeRoom && loading) || !activeRoom) {
    return <LoadingState label="Abrindo comando da partida" />;
  }

  const currentRoom = activeRoom;
  const currentMatch = currentRoom.match;

  async function refreshRooms() {
    const fresh = await api.listRooms(session.accessToken);
    setRooms(fresh);
  }

  async function handleThemeChange(nextTheme: ThemeKey) {
    const response = await api.updateRoom(session.accessToken, currentRoom.roomId, {
      theme: nextTheme,
    });
    setRooms((current) =>
      current.map((entry) => (entry.roomId === response.room.roomId ? response.room : entry)),
    );
  }

  return (
    <main className="noise-layer min-h-screen px-4 py-4 md:px-6 md:py-6">
      <CelebrationLayer winnerKey={currentMatch.lastWinner?.triggeredByDrawId} />
      <WinnerOverlay winner={currentMatch.lastWinner} currentDraw={currentMatch.currentDraw?.display} />

      <div className="mx-auto max-w-[1600px] space-y-6">
        <GlassPanel className="rounded-[34px] p-5 md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="m-0 text-[0.72rem] uppercase tracking-[0.3em] text-[var(--muted-text)]">
                Painel do anfitriao
              </p>
              <h1 className="m-0 mt-3 font-display text-[clamp(2.6rem,5vw,4.8rem)] leading-[0.92] text-gradient">
                Bingo Familiar Premium
              </h1>
              <p className="m-0 mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-text)]">
                {auth.user.name} comandando {currentRoom.roomName}. Sorteio manual, cartelas digitais, quase-bingo,
                narrador automatico e telao sincronizado em tempo real.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <HighContrastToggle active={highContrast} onToggle={() => setHighContrast((current) => !current)} />
              <Button variant="secondary" onClick={() => setSoundEnabled((current) => !current)}>
                Som {soundEnabled ? 'ligado' : 'desligado'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  clearAuth();
                  window.location.href = '/login';
                }}
              >
                Sair
              </Button>
            </div>
          </div>
        </GlassPanel>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.5fr_0.92fr]">
          <aside className="space-y-5">
            <GlassPanel className="rounded-[30px] p-5">
              <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
                Salas
              </p>
              <div className="mt-4 space-y-3">
                {rooms.map((entry) => (
                  <button
                    key={entry.roomId}
                    className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                      selectedRoomCode === entry.roomCode
                        ? 'border-transparent bg-white text-slate-950'
                        : 'border-white/8 bg-white/5 text-[var(--text-color)]'
                    }`}
                    onClick={() => setSelectedRoomCode(entry.roomCode)}
                  >
                    <p className="m-0 font-display text-lg">{entry.roomName}</p>
                    <p className="m-0 mt-1 text-xs uppercase tracking-[0.2em] opacity-70">
                      {entry.roomCode}
                    </p>
                  </button>
                ))}
              </div>
              {error ? <p className="m-0 mt-3 text-sm text-rose-300">{error}</p> : null}
              <Button className="mt-4 w-full" variant="secondary" onClick={() => void refreshRooms()}>
                Atualizar salas
              </Button>
            </GlassPanel>

            <ThemeSwitcher theme={currentRoom.theme} onChange={(theme) => void handleThemeChange(theme)} />
            <QRJoinPanel room={currentRoom} />
          </aside>

          <section className="space-y-5">
            <DrawSpotlight draw={currentMatch.currentDraw} />
            <AnnouncementBanner cues={currentMatch.announcements} />
            <ManualDrawPad
              currentDraw={currentMatch.currentDraw}
                disabled={currentMatch.status === 'paused' || currentMatch.status === 'completed'}
              onSubmit={(payload) => api.addDraw(session.accessToken, currentMatch.matchId, payload).then(() => undefined)}
              onCorrectLast={(payload) =>
                currentMatch.currentDraw
                  ? api.correctDraw(session.accessToken, currentMatch.matchId, currentMatch.currentDraw.id, payload).then(() => undefined)
                  : Promise.resolve()
              }
              onRevertLast={() =>
                currentMatch.currentDraw
                  ? api.revertDraw(session.accessToken, currentMatch.matchId, currentMatch.currentDraw.id).then(() => undefined)
                  : Promise.resolve()
              }
            />

            <GlassPanel className="space-y-4 rounded-[30px] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
                    Historico e status
                  </p>
                  <p className="m-0 mt-1 text-sm text-[var(--muted-text)]">
                    Rodada ativa: {currentMatch.prizeRounds.find((entry) => entry.id === currentMatch.currentPrizeRoundId)?.label ?? 'Encerrada'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentMatch.status !== 'live' ? (
                    <Button variant="secondary" onClick={() => void api.resumeMatch(session.accessToken, currentMatch.matchId)}>
                      Colocar ao vivo
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={() => void api.pauseMatch(session.accessToken, currentMatch.matchId)}>
                      Pausar
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => void api.replayLast(session.accessToken, currentMatch.matchId)}>
                    Replay ultimo
                  </Button>
                  <Button variant="ghost" onClick={() => void api.endMatch(session.accessToken, currentMatch.matchId)}>
                    Encerrar
                  </Button>
                </div>
              </div>

              <RecentDrawsRail draws={currentMatch.recentDraws} />
            </GlassPanel>
          </section>

          <aside className="space-y-5">
            <ProximityTicker entries={deferredProximity} />
            <RankingRail entries={deferredProximity} />
            <GlassPanel className="rounded-[30px] p-5">
              <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
                Prêmios da noite
              </p>
              <div className="mt-4 space-y-3">
                {currentMatch.prizeRounds.map((round) => (
                  <div
                    key={round.id}
                    className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="m-0 font-semibold text-[var(--text-color)]">{round.label}</p>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-[var(--muted-text)]">
                        {round.completedAt ? 'Concluida' : 'Em jogo'}
                      </span>
                    </div>
                    <p className="m-0 mt-1 text-sm text-[var(--muted-text)]">{round.prize}</p>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </aside>
        </div>
      </div>
    </main>
  );
}
