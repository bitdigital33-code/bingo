import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type {
  AdminHistoryItemDto,
  CreatePrizeRoundRequest,
  CreateRoomRequest,
  GeneratePrintableCardsRequest,
  GeneratePrintableCardsResponse,
  PrintableCardDto,
  PlayerSessionDto,
  ProximityEntry,
  PrizePattern,
  PrizeRoundConfig,
  RoomSnapshot,
  StageMomentKey,
  StageMomentRequest,
  ThemeKey,
  UpdatePrizeRoundsRequest,
  VerifyPrintableCardResponseDto,
} from "@bingo/contracts";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Camera,
  Gift,
  Home,
  Eye,
  EyeOff,
  ListOrdered,
  Mic2,
  MonitorCog,
  PartyPopper,
  Palette,
  Plus,
  QrCode,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Search,
  Trash2,
  Trophy,
  Tv,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button, GlassPanel } from "@bingo/ui";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { CelebrationLayer } from "@/components/celebration-layer";
import { DrawSpotlight } from "@/components/draw-spotlight";
import { HighContrastToggle } from "@/components/high-contrast-toggle";
import { LoadingState } from "@/components/loading-state";
import { ManualDrawPad } from "@/components/manual-draw-pad";
import { ProximityTicker } from "@/components/proximity-ticker";
import { QRJoinPanel } from "@/components/qr-join-panel";
import { RankingRail } from "@/components/ranking-rail";
import { RecentDrawsRail } from "@/components/recent-draws-rail";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { WinnerOverlay } from "@/components/winner-overlay";
import { api } from "@/lib/api";
import { clearAuth, loadAuth } from "@/lib/session";
import { useRoomChannel } from "@/hooks/use-room-channel";
import { useSpeechAnnouncer } from "@/hooks/use-speech-announcer";
import { useThemeShell } from "@/hooks/use-theme-shell";

export function AdminDashboardPage() {
  const auth = useMemo(() => loadAuth(), []);
  const [rooms, setRooms] = useState<RoomSnapshot[]>([]);
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>();
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminSection>("panel");
  const [error, setError] = useState<string>();
  const [actionBusy, setActionBusy] = useState<string>();
  const [historyItems, setHistoryItems] = useState<AdminHistoryItemDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [printableBatch, setPrintableBatch] =
    useState<GeneratePrintableCardsResponse>();
  const [printableLoading, setPrintableLoading] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<VerifyPrintableCardResponseDto>();
  const [verificationLoading, setVerificationLoading] = useState(false);

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
        if (isStaleAuthError(reason)) {
          clearAuth();
          window.location.href = "/login";
          return;
        }

        setError(
          reason instanceof Error
            ? reason.message
            : "Falha ao carregar o painel.",
        );
      })
      .finally(() => setBootstrapLoading(false));
  }, [auth]);

  const loader = useMemo(
    () =>
      selectedRoomCode ? () => api.getRoomState(selectedRoomCode) : undefined,
    [selectedRoomCode],
  );
  const {
    room,
    loading,
    error: roomChannelError,
    setRoom,
  } = useRoomChannel(selectedRoomCode, loader);
  const bootstrapRoom = rooms.find(
    (entry) => entry.roomCode === selectedRoomCode,
  );
  const activeRoom = room ?? bootstrapRoom;
  const deferredProximity = useDeferredValue(
    activeRoom?.match.proximityBoard ?? [],
  );

  const applyRoomSnapshot = useCallback(
    (nextRoom: RoomSnapshot) => {
      setRoom(nextRoom);
      setRooms((current) => {
        const next = current.slice();
        const index = next.findIndex(
          (entry) => entry.roomId === nextRoom.roomId,
        );
        if (index >= 0) {
          next[index] = nextRoom;
          return next;
        }

        return [...next, nextRoom];
      });
    },
    [setRoom],
  );

  const refreshHistory = useCallback(
    async (roomId: string) => {
      if (!auth) {
        return;
      }

      setHistoryLoading(true);
      try {
        const response = await api.getRoomHistory(auth.accessToken, roomId);
        setHistoryItems(response.items.slice(0, 12));
      } catch (reason) {
        setError(
          readErrorMessage(reason, "Falha ao carregar o registro operacional."),
        );
      } finally {
        setHistoryLoading(false);
      }
    },
    [auth],
  );

  const runRoomCommand = useCallback(
    async (label: string, task: () => Promise<{ room: RoomSnapshot }>) => {
      setActionBusy(label);
      setError(undefined);
      try {
        const response = await task();
        applyRoomSnapshot(response.room);
        void refreshHistory(response.room.roomId);
      } catch (reason) {
        setError(
          readErrorMessage(reason, "Comando nao aplicado pelo servidor."),
        );
      } finally {
        setActionBusy(undefined);
      }
    },
    [applyRoomSnapshot, refreshHistory],
  );

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

  useEffect(() => {
    if (roomChannelError) {
      setError(roomChannelError);
    }
  }, [roomChannelError]);

  useEffect(() => {
    if (!activeRoom?.roomId) {
      return;
    }

    void refreshHistory(activeRoom.roomId);
  }, [
    activeRoom?.roomId,
    activeRoom?.match.currentDraw?.id,
    activeRoom?.match.lastWinner?.triggeredByDrawId,
    activeRoom?.match.status,
    refreshHistory,
  ]);

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  const session = auth;

  async function handleCreateRoom(payload: CreateRoomSetupRequest) {
    setActionBusy("Criacao");
    setError(undefined);
    try {
      const response = await api.createRoom(
        session.accessToken,
        buildCreateRoomRequest(payload),
      );
      applyRoomSnapshot(response.room);
      setSelectedRoomCode(response.room.roomCode);
      void refreshHistory(response.room.roomId);

      if (payload.printCardsOnCreate) {
        setPrintableLoading(true);
        try {
          const batch = await api.generatePrintableCards(
            session.accessToken,
            response.room.roomId,
            {
              ...payload.printableCards,
              title:
                payload.printableCards.title?.trim() ||
                response.room.roomName,
            },
          );
          setPrintableBatch(batch);
          void refreshHistory(response.room.roomId);
        } catch (reason) {
          setError(
            readErrorMessage(
              reason,
              "Sala criada, mas nao foi possivel emitir as cartelas impressas.",
            ),
          );
        } finally {
          setPrintableLoading(false);
        }
      }
    } catch (reason) {
      setError(readErrorMessage(reason, "Nao foi possivel criar a sala."));
    } finally {
      setActionBusy(undefined);
    }
  }

  async function handleDeleteRoom(roomToDelete: RoomSnapshot) {
    const confirmed = window.confirm(
      `Excluir a sala "${roomToDelete.roomName}"? Esta acao remove a sala, partida, jogadores, cartelas vinculadas e sorteios dessa sala. Se for a ultima sala, o painel volta para a criacao do zero.`,
    );
    if (!confirmed) {
      return;
    }

    setActionBusy("Exclusao");
    setError(undefined);
    try {
      const response = await api.deleteRoom(
        session.accessToken,
        roomToDelete.roomId,
      );
      setRoom(undefined);
      setRooms(response.rooms);
      setHistoryItems([]);
      setSelectedRoomCode(response.rooms[0]?.roomCode);
    } catch (reason) {
      setError(readErrorMessage(reason, "Nao foi possivel excluir a sala."));
    } finally {
      setActionBusy(undefined);
    }
  }

  if (bootstrapLoading || (!activeRoom && loading && rooms.length > 0)) {
    return <LoadingState label="Abrindo comando da partida" />;
  }

  if (!activeRoom) {
    return (
      <AdminEmptyRoomsPage
        userName={session.user.name}
        disabled={Boolean(actionBusy)}
        error={error}
        onCreate={handleCreateRoom}
      />
    );
  }

  const currentRoom = activeRoom;
  const currentMatch = currentRoom.match;
  const activePrizeRound = currentMatch.prizeRounds.find(
    (entry) => entry.id === currentMatch.currentPrizeRoundId,
  );
  const nextPrizeRound =
    currentMatch.prizeRounds.find(
      (entry) => !entry.completedAt && entry.id !== activePrizeRound?.id,
    ) ?? activePrizeRound;

  async function refreshRooms() {
    const fresh = await api.listRooms(session.accessToken);
    setRooms(fresh);
    const refreshedActive = fresh.find(
      (entry) => entry.roomCode === selectedRoomCode,
    );
    if (refreshedActive) {
      applyRoomSnapshot(refreshedActive);
      void refreshHistory(refreshedActive.roomId);
    }
  }

  async function handleThemeChange(nextTheme: ThemeKey) {
    await runRoomCommand("Tema", () =>
      api.updateRoom(session.accessToken, currentRoom.roomId, {
        theme: nextTheme,
      }),
    );
  }

  async function handleGeneratePrintableCards(
    payload: GeneratePrintableCardsRequest,
  ) {
    setPrintableLoading(true);
    setError(undefined);
    try {
      const response = await api.generatePrintableCards(
        session.accessToken,
        currentRoom.roomId,
        payload,
      );
      setPrintableBatch(response);
      void refreshHistory(currentRoom.roomId);
    } catch (reason) {
      setError(readErrorMessage(reason, "Nao foi possivel gerar as cartelas."));
    } finally {
      setPrintableLoading(false);
    }
  }

  async function handleVerifyPrintableCard(code: string) {
    setVerificationLoading(true);
    setVerificationResult(undefined);
    setError(undefined);
    try {
      const response = await api.verifyPrintableCard(
        session.accessToken,
        currentRoom.roomId,
        {
          code,
        },
      );
      setVerificationResult(response);
      void refreshHistory(currentRoom.roomId);
    } catch (reason) {
      setError(
        readErrorMessage(reason, "Nao foi possivel conferir a cartela."),
      );
    } finally {
      setVerificationLoading(false);
    }
  }

  async function handleUpdatePrizeRounds(payload: UpdatePrizeRoundsRequest) {
    await runRoomCommand("Premios", () =>
      api.updatePrizeRounds(session.accessToken, currentRoom.roomId, payload),
    );
  }

  async function handleSetPrizeShowcase(
    roundId: string | undefined,
    visible: boolean,
  ) {
    await runRoomCommand("Telao", () =>
      api.setPrizeShowcase(session.accessToken, currentRoom.roomId, {
        roundId,
        visible,
      }),
    );
  }

  async function handleSetStageMoment(payload: StageMomentRequest) {
    await runRoomCommand("Momento", () =>
      api.setStageMoment(session.accessToken, currentRoom.roomId, payload),
    );
  }

  async function handleSetRecentDrawsShowcase(visible: boolean) {
    await runRoomCommand("Ultimos numeros", () =>
      api.setRecentDrawsShowcase(session.accessToken, currentRoom.roomId, {
        visible,
      }),
    );
  }

  async function handleBroadcastNearWinAlert(entry: ProximityEntry) {
    await handleSetStageMoment({
      visible: true,
      key: "near_win",
      title: nearWinAlertTitle(entry),
      message: nearWinAlertMessage(entry),
      durationSeconds: 8,
    });
  }

  async function handleResetTvPresentation() {
    await runRoomCommand("Telao", () =>
      api.resetTvPresentation(session.accessToken, currentRoom.roomId),
    );
  }

  async function handleCloseAndCreateRoom() {
    const confirmed = window.confirm(
      `Encerrar "${currentRoom.roomName}" e abrir uma sala nova limpa? A sala atual continua no historico ate voce excluir.`,
    );
    if (!confirmed) {
      return;
    }

    setActionBusy("Nova sala");
    setError(undefined);
    try {
      if (currentMatch.status !== "completed") {
        const closed = await api.endMatch(
          session.accessToken,
          currentMatch.matchId,
        );
        applyRoomSnapshot(closed.room);
      }

      const response = await api.createRoom(session.accessToken, {
        name: buildFreshRoomName(),
        theme: currentRoom.theme,
        maxCardsPerPlayer: currentRoom.maxCardsPerPlayer,
        allowAutoMark: currentRoom.allowAutoMark,
        allowManualMark: currentRoom.allowManualMark,
      });

      applyRoomSnapshot(response.room);
      setSelectedRoomCode(response.room.roomCode);
      setHistoryItems([]);
      void refreshHistory(response.room.roomId);
    } catch (reason) {
      setError(
        readErrorMessage(
          reason,
          "Nao foi possivel encerrar e abrir uma sala nova.",
        ),
      );
    } finally {
      setActionBusy(undefined);
    }
  }

  return (
    <>
      <main className="noise-layer no-print min-h-screen px-4 py-4 md:px-6 md:py-6">
        <CelebrationLayer
          winnerKey={currentMatch.lastWinner?.triggeredByDrawId}
        />
        <WinnerOverlay
          winner={currentMatch.lastWinner}
          currentDraw={currentMatch.currentDraw?.display}
        />

        <div className="mx-auto max-w-[1680px] space-y-5">
          <section className="premium-frame rounded-[22px] px-5 py-5 md:px-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-[10px] border border-[var(--gold)]/35 bg-[var(--gold)]/10 px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
                    1. Painel do anfitriao
                  </span>
                  <span className="rounded-[10px] border border-white/10 bg-white/5 px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[var(--muted-text)]">
                    {matchStatusLabel(currentMatch.status)}
                  </span>
                  <span className="rounded-[10px] border border-white/10 bg-white/5 px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[var(--muted-text)]">
                    Sala {currentRoom.roomCode}
                  </span>
                </div>
                <h1 className="m-0 mt-3 truncate font-display text-[clamp(2.4rem,4vw,3.8rem)] leading-none text-[var(--text-color)]">
                  Painel do Anfitriao
                </h1>
                <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-text)]">
                  {auth.user.name} no comando total da sala.
                </p>
                <h2 className="m-0 mt-5 truncate font-display text-[clamp(1.8rem,3vw,2.7rem)] leading-none text-gradient">
                  {currentRoom.roomName}
                </h2>
                <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-text)]">
                  Sorteio manual, premios, jogadores, TV e validacao ficam no mesmo cockpit.
                </p>
              </div>

              <div className="flex flex-wrap justify-start gap-2 xl:max-w-[32rem] xl:justify-end">
                <Button
                  className="gap-2"
                  disabled={Boolean(actionBusy)}
                  onClick={() => void handleCloseAndCreateRoom()}
                >
                  <Plus className="h-4 w-4" />
                  Encerrar e nova sala
                </Button>
                <HighContrastToggle
                  active={highContrast}
                  onToggle={() => setHighContrast((current) => !current)}
                />
                <Button
                  variant="secondary"
                  onClick={() => setSoundEnabled((current) => !current)}
                >
                  Som {soundEnabled ? "ligado" : "desligado"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearAuth();
                    window.location.href = "/login";
                  }}
                >
                  Sair
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <AdminMetricTile
                label="Premio principal"
                value={activePrizeRound?.prize ?? "A definir"}
                detail={activePrizeRound?.label ?? "Rodada ativa"}
              />
              <AdminMetricTile
                label="Proximo premio"
                value={nextPrizeRound?.prize ?? "A definir"}
                detail={nextPrizeRound?.label ?? "Fila de premios"}
              />
              <AdminMetricTile
                label="Rodada"
                value={`${Math.max(currentMatch.drawnNumbers.length, 0)} / 75`}
                detail={currentMatch.currentDraw?.display ?? "Sem sorteio"}
              />
              <AdminMetricTile
                label="Jogadores online"
                value={String(currentMatch.playersOnline)}
                detail={`${currentMatch.players.length} participantes`}
              />
            </div>
          </section>

          {error ? (
            <p className="m-0 rounded-[18px] border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100 shadow-lg shadow-rose-950/20">
              {error}
            </p>
          ) : null}

          <div className="grid min-w-0 gap-5 xl:grid-cols-[18.5rem_minmax(0,1fr)]">
            <AdminSidebar
              activeSection={adminSection}
              currentRoom={currentRoom}
              highContrast={highContrast}
              rooms={rooms}
              selectedRoomCode={selectedRoomCode}
              soundEnabled={soundEnabled}
              userName={session.user.name}
              onRefreshRooms={() => void refreshRooms()}
              onSectionChange={setAdminSection}
              onSelectRoom={setSelectedRoomCode}
            />

            <section className="min-w-0 space-y-5">
              {adminSection === "panel" ? (
                <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_24rem]">
                  <div className="min-w-0 space-y-5">
                    <AdminCommandOverview match={currentMatch} />
                    <DrawSpotlight draw={currentMatch.currentDraw} />
                    <AnnouncementBanner cues={currentMatch.announcements} />
                    <ManualDrawPad
                      currentDraw={currentMatch.currentDraw}
                      disabled={
                        Boolean(actionBusy) ||
                        currentMatch.status === "paused" ||
                        currentMatch.status === "completed"
                      }
                      onSubmit={(payload) =>
                        runRoomCommand("Sorteio", () =>
                          api.addDraw(
                            session.accessToken,
                            currentMatch.matchId,
                            payload,
                          ),
                        )
                      }
                      onCorrectLast={(payload) =>
                        currentMatch.currentDraw
                          ? runRoomCommand("Correcao", () =>
                              api.correctDraw(
                                session.accessToken,
                                currentMatch.matchId,
                                currentMatch.currentDraw!.id,
                                payload,
                              ),
                            )
                          : Promise.resolve()
                      }
                      onRevertLast={() =>
                        currentMatch.currentDraw
                          ? runRoomCommand("Reversao", () =>
                              api.revertDraw(
                                session.accessToken,
                                currentMatch.matchId,
                                currentMatch.currentDraw!.id,
                              ),
                            )
                          : Promise.resolve()
                      }
                    />

                    <GlassPanel className="space-y-4 rounded-[22px] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
                            Historico e status
                          </p>
                          <p className="m-0 mt-1 text-sm text-[var(--muted-text)]">
                            Rodada ativa:{" "}
                            {currentMatch.prizeRounds.find(
                              (entry) =>
                                entry.id === currentMatch.currentPrizeRoundId,
                            )?.label ?? "Encerrada"}
                          </p>
                          <p className="m-0 mt-1 text-sm font-semibold text-[var(--text-color)]">
                            Status: {matchStatusLabel(currentMatch.status)}
                            {actionBusy
                              ? ` - aplicando ${actionBusy.toLowerCase()}...`
                              : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {currentMatch.status === "completed" ? (
                            <Button variant="secondary" disabled>
                              Partida encerrada
                            </Button>
                          ) : currentMatch.status !== "live" ? (
                            <Button
                              variant="secondary"
                              disabled={Boolean(actionBusy)}
                              onClick={() =>
                                void runRoomCommand("Retomada", () =>
                                  api.resumeMatch(
                                    session.accessToken,
                                    currentMatch.matchId,
                                  ),
                                )
                              }
                            >
                              Colocar ao vivo
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              disabled={Boolean(actionBusy)}
                              onClick={() =>
                                void runRoomCommand("Pausa", () =>
                                  api.pauseMatch(
                                    session.accessToken,
                                    currentMatch.matchId,
                                  ),
                                )
                              }
                            >
                              Pausar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            disabled={
                              Boolean(actionBusy) || !currentMatch.currentDraw
                            }
                            onClick={() =>
                              void runRoomCommand("Replay", () =>
                                api.replayLast(
                                  session.accessToken,
                                  currentMatch.matchId,
                                ),
                              )
                            }
                          >
                            Replay ultimo
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={
                              Boolean(actionBusy) ||
                              currentMatch.status === "completed"
                            }
                            onClick={() =>
                              void runRoomCommand("Encerramento", () =>
                                api.endMatch(
                                  session.accessToken,
                                  currentMatch.matchId,
                                ),
                              )
                            }
                          >
                            {currentMatch.status === "completed"
                              ? "Encerrada"
                              : "Encerrar"}
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={Boolean(actionBusy)}
                            onClick={() => void handleCloseAndCreateRoom()}
                          >
                            Nova sala limpa
                          </Button>
                        </div>
                      </div>

                      <RecentDrawsRail draws={currentMatch.recentDraws} />
                    </GlassPanel>
                  </div>

                  <aside className="min-w-0 space-y-4">
                    <ProximityTicker
                      entries={deferredProximity}
                      onBroadcastAlert={(entry) =>
                        void handleBroadcastNearWinAlert(entry)
                      }
                    />
                    <RankingRail entries={deferredProximity} />
                    <AdminHistoryPanel
                      items={historyItems}
                      loading={historyLoading}
                      onRefresh={() => void refreshHistory(currentRoom.roomId)}
                    />
                  </aside>
                </div>
              ) : null}

              {adminSection === "rooms" ? (
                <div className="space-y-5">
                  <AdminSectionHeader
                    description="Crie, alterne ou remova salas mantendo o QR do evento sempre a mao."
                    label="Salas"
                    title="Controle de salas"
                  />
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
                    <GlassPanel className="rounded-[22px] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
                            Salas disponiveis
                          </p>
                          <p className="m-0 mt-1 text-sm text-[var(--muted-text)]">
                            Escolha a sala que o anfitriao esta comandando.
                          </p>
                        </div>
                        <Button
                          className="px-3 py-2 text-xs"
                          variant="ghost"
                          onClick={() => void refreshRooms()}
                        >
                          Atualizar
                        </Button>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {rooms.map((entry) => (
                          <button
                            key={entry.roomId}
                            className={`rounded-[18px] border px-4 py-4 text-left transition ${
                              selectedRoomCode === entry.roomCode
                                ? "border-[var(--gold)]/50 bg-[var(--gold)]/14 text-[var(--text-color)] shadow-xl shadow-[var(--gold)]/10"
                                : "border-[var(--border-color)] bg-white/5 text-[var(--text-color)] hover:border-[var(--gold)]/35 hover:bg-white/8"
                            }`}
                            onClick={() => setSelectedRoomCode(entry.roomCode)}
                          >
                            <span className="text-[0.64rem] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
                              {entry.roomCode}
                            </span>
                            <p className="m-0 mt-2 truncate font-display text-2xl font-bold">
                              {entry.roomName}
                            </p>
                            <p className="m-0 mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted-text)]">
                              {matchStatusLabel(entry.match.status)}
                            </p>
                          </button>
                        ))}
                      </div>
                    </GlassPanel>

                    <div className="space-y-5">
                      <AdminCreateRoomPanel
                        disabled={Boolean(actionBusy)}
                        onCreate={handleCreateRoom}
                      />
                      <QRJoinPanel room={currentRoom} />
                      <GlassPanel className="rounded-[22px] border-rose-200/20 bg-rose-400/10 p-5">
                        <div className="flex items-start gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-rose-200/25 bg-rose-400/15 text-rose-100">
                            <Trash2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="m-0 text-[0.68rem] font-black uppercase tracking-[0.22em] text-rose-100">
                              Remover sala
                            </p>
                            <p className="m-0 mt-2 text-sm font-semibold text-[var(--text-color)]">
                              {currentRoom.roomName}
                            </p>
                            <p className="m-0 mt-1 text-xs leading-5 text-[var(--muted-text)]">
                              Exclui a sala selecionada, partida, jogadores,
                              cartelas vinculadas e historico operacional.
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={Boolean(actionBusy)}
                              className="mt-4 w-full gap-2 border-rose-200/25 text-rose-100 hover:border-rose-200/45"
                              onClick={() => handleDeleteRoom(currentRoom)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir sala selecionada
                            </Button>
                          </div>
                        </div>
                      </GlassPanel>
                    </div>
                  </div>
                </div>
              ) : null}

              {adminSection === "match" ? (
                <div className="space-y-5">
                  <AdminSectionHeader
                    description="Sorteio manual grande, correcao segura, reversao e replay para o telao."
                    label="Partida"
                    title="Comando da rodada"
                  />
                  <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="min-w-0 space-y-5">
                      <ManualDrawPad
                        currentDraw={currentMatch.currentDraw}
                        disabled={
                          Boolean(actionBusy) ||
                          currentMatch.status === "paused" ||
                          currentMatch.status === "completed"
                        }
                        onSubmit={(payload) =>
                          runRoomCommand("Sorteio", () =>
                            api.addDraw(
                              session.accessToken,
                              currentMatch.matchId,
                              payload,
                            ),
                          )
                        }
                        onCorrectLast={(payload) =>
                          currentMatch.currentDraw
                            ? runRoomCommand("Correcao", () =>
                                api.correctDraw(
                                  session.accessToken,
                                  currentMatch.matchId,
                                  currentMatch.currentDraw!.id,
                                  payload,
                                ),
                              )
                            : Promise.resolve()
                        }
                        onRevertLast={() =>
                          currentMatch.currentDraw
                            ? runRoomCommand("Reversao", () =>
                                api.revertDraw(
                                  session.accessToken,
                                  currentMatch.matchId,
                                  currentMatch.currentDraw!.id,
                                ),
                              )
                            : Promise.resolve()
                        }
                      />
                      <GlassPanel className="space-y-4 rounded-[22px] p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
                              Estado operacional
                            </p>
                            <p className="m-0 mt-1 text-sm font-semibold text-[var(--text-color)]">
                              {matchStatusLabel(currentMatch.status)}
                              {actionBusy
                                ? ` - aplicando ${actionBusy.toLowerCase()}...`
                                : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {currentMatch.status !== "live" ? (
                              <Button
                                variant="secondary"
                                disabled={
                                  Boolean(actionBusy) ||
                                  currentMatch.status === "completed"
                                }
                                onClick={() =>
                                  void runRoomCommand("Retomada", () =>
                                    api.resumeMatch(
                                      session.accessToken,
                                      currentMatch.matchId,
                                    ),
                                  )
                                }
                              >
                                Ao vivo
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                disabled={Boolean(actionBusy)}
                                onClick={() =>
                                  void runRoomCommand("Pausa", () =>
                                    api.pauseMatch(
                                      session.accessToken,
                                      currentMatch.matchId,
                                    ),
                                  )
                                }
                              >
                                Pausar
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              disabled={
                                Boolean(actionBusy) ||
                                !currentMatch.currentDraw
                              }
                              onClick={() =>
                                void runRoomCommand("Replay", () =>
                                  api.replayLast(
                                    session.accessToken,
                                    currentMatch.matchId,
                                  ),
                                )
                              }
                            >
                              Replay
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={
                                Boolean(actionBusy) ||
                                currentMatch.status === "completed"
                              }
                              onClick={() =>
                                void runRoomCommand("Encerramento", () =>
                                  api.endMatch(
                                    session.accessToken,
                                    currentMatch.matchId,
                                  ),
                                )
                              }
                            >
                              Encerrar
                            </Button>
                          </div>
                        </div>
                        <RecentDrawsRail draws={currentMatch.recentDraws} />
                      </GlassPanel>
                    </div>
                    <div className="space-y-5">
                      <DrawSpotlight draw={currentMatch.currentDraw} />
                      <AdminHistoryPanel
                        items={historyItems}
                        loading={historyLoading}
                        onRefresh={() => void refreshHistory(currentRoom.roomId)}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {adminSection === "players" ? (
                <div className="space-y-5">
                  <AdminSectionHeader
                    description="Acompanhe quem esta perto do bingo e aja rapido sem poluir a tela principal."
                    label="Jogadores"
                    title="Mesa social da sala"
                  />
                  <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <AdminPlayersPanel
                      players={currentMatch.players}
                      disabled={Boolean(actionBusy)}
                      onToggleAutoMark={(player) =>
                        runRoomCommand("Jogador", () =>
                          api.updatePlayer(
                            session.accessToken,
                            currentRoom.roomId,
                            player.id,
                            {
                              autoMark: !isPlayerAutoMarked(player),
                            },
                          ),
                        )
                      }
                      onRemove={(player) =>
                        runRoomCommand("Remocao", () =>
                          api.removePlayer(
                            session.accessToken,
                            currentRoom.roomId,
                            player.id,
                          ),
                        )
                      }
                    />
                    <div className="space-y-5">
                      <ProximityTicker
                        entries={deferredProximity}
                        onBroadcastAlert={(entry) =>
                          void handleBroadcastNearWinAlert(entry)
                        }
                      />
                      <RankingRail entries={deferredProximity} />
                    </div>
                  </div>
                </div>
              ) : null}

              {adminSection === "prizes" ? (
                <div className="space-y-5">
                  <AdminSectionHeader
                    description="Configure rodadas, premios e o que aparece no modo TV para a familia."
                    label="Premios"
                    title="Palco dos premios"
                  />
                  <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <AdminPrizeCommandPanel
                      match={currentMatch}
                      disabled={
                        Boolean(actionBusy) || Boolean(currentMatch.endedAt)
                      }
                      onShowcase={handleSetPrizeShowcase}
                      onUpdate={handleUpdatePrizeRounds}
                      onResetTv={handleResetTvPresentation}
                    />
                    <AdminCommandOverview match={currentMatch} />
                  </div>
                </div>
              ) : null}

              {adminSection === "themes" ? (
                <div className="space-y-5">
                  <AdminSectionHeader
                    description="Troque o clima da noite sem perder contraste, legibilidade e identidade premium."
                    label="Temas"
                    title="Direcao visual"
                  />
                  <div className="grid gap-5 lg:grid-cols-[24rem_minmax(0,1fr)]">
                    <ThemeSwitcher
                      theme={currentRoom.theme}
                      onChange={(theme) => void handleThemeChange(theme)}
                    />
                    <GlassPanel className="rounded-[22px] p-5">
                      <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
                        Previa da sala
                      </p>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <AdminMetricTile
                          label="Tema atual"
                          value={currentRoom.theme}
                          detail="Aplicado no painel, jogador e TV"
                        />
                        <AdminMetricTile
                          label="Contraste"
                          value={highContrast ? "Alto" : "Padrao"}
                          detail="Pensado para projetor e idosos"
                        />
                        <AdminMetricTile
                          label="Audio"
                          value={soundEnabled ? "Ligado" : "Desligado"}
                          detail="Narracao local do anfitriao"
                        />
                      </div>
                    </GlassPanel>
                  </div>
                </div>
              ) : null}

              {adminSection === "stats" ? (
                <div className="space-y-5">
                  <AdminSectionHeader
                    description="Um raio-x rapido da partida: atividade, ultimos eventos e ranking de proximidade."
                    label="Estatisticas"
                    title="Pulso do evento"
                  />
                  <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <div className="space-y-5">
                      <AdminCommandOverview match={currentMatch} />
                      <AdminHistoryPanel
                        items={historyItems}
                        loading={historyLoading}
                        onRefresh={() => void refreshHistory(currentRoom.roomId)}
                      />
                    </div>
                    <RankingRail entries={deferredProximity} />
                  </div>
                </div>
              ) : null}

              {adminSection === "tv" ? (
                <div className="space-y-5">
                  <AdminSectionHeader
                    description="Prepare o telao, dispare momentos de palco e mantenha o publico olhando para o numero certo."
                    label="TV Mode"
                    title="Modo sala cinematografico"
                  />
                  <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <div className="space-y-5">
                      <DrawSpotlight draw={currentMatch.currentDraw} large />
                      <AnnouncementBanner cues={currentMatch.announcements} />
                    </div>
                    <div className="space-y-5">
                      <GlassPanel className="rounded-[22px] p-5">
                        <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
                          Tela publica
                        </p>
                        <p className="m-0 mt-2 text-sm leading-6 text-[var(--muted-text)]">
                          Abra em uma Smart TV, projetor ou segunda janela. O
                          telao mostra apenas o necessario para o publico.
                        </p>
                        <a
                          className="mt-4 inline-flex"
                          href={`/room/${currentRoom.roomCode}/tv`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Button className="gap-2">
                            <Tv className="h-4 w-4" />
                            Abrir TV / Projetor
                          </Button>
                        </a>
                      </GlassPanel>
                      <AdminStageMomentsPanel
                        room={currentRoom}
                        disabled={
                          Boolean(actionBusy) || Boolean(currentMatch.endedAt)
                        }
                        onResetTv={handleResetTvPresentation}
                        onSetRecentDraws={handleSetRecentDrawsShowcase}
                        onSetStageMoment={handleSetStageMoment}
                      />
                      <QRJoinPanel room={currentRoom} />
                    </div>
                  </div>
                </div>
              ) : null}

              {adminSection === "settings" ? (
                <div className="space-y-5">
                  <AdminSectionHeader
                    description="Regras de entrada, cartelas impressas, QR seguro e manutencao da sala."
                    label="Configuracoes"
                    title="Operacao segura"
                  />
                  <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <div className="space-y-5">
                      <AdminRoomSettingsPanel
                        room={currentRoom}
                        disabled={Boolean(actionBusy)}
                        onUpdate={(payload) =>
                          runRoomCommand("Configuracao", () =>
                            api.updateRoom(
                              session.accessToken,
                              currentRoom.roomId,
                              payload,
                            ),
                          )
                        }
                        onDelete={() => handleDeleteRoom(currentRoom)}
                      />
                      <AdminPrintableCardsPanel
                        room={currentRoom}
                        disabled={
                          Boolean(actionBusy) ||
                          printableLoading ||
                          verificationLoading
                        }
                        loading={printableLoading}
                        onGenerate={handleGeneratePrintableCards}
                        onVerify={handleVerifyPrintableCard}
                        verification={verificationResult}
                        verificationLoading={verificationLoading}
                      />
                    </div>
                    <QRJoinPanel room={currentRoom} />
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </main>
      {printableBatch ? (
        <PrintableCardsPrintStudio
          batch={printableBatch}
          onClose={() => setPrintableBatch(undefined)}
        />
      ) : null}
    </>
  );
}

const THEME_OPTIONS: Array<{ key: ThemeKey; label: string }> = [
  { key: "cassino", label: "Cassino" },
  { key: "natal", label: "Natal" },
  { key: "neon", label: "Neon" },
  { key: "junina", label: "Festa Junina" },
  { key: "infantil", label: "Infantil" },
];

const PRIZE_RULE_OPTIONS: Array<{ value: PrizePattern; label: string }> = [
  { value: "marked_count", label: "X bolas na cartela" },
  { value: "single_line", label: "1 linha" },
  { value: "double_line", label: "2 linhas" },
  { value: "full_house", label: "Cartela cheia" },
];

const STAGE_MOMENT_PRESETS: Array<{
  key: StageMomentKey;
  title: string;
  message: string;
  label: string;
}> = [
  {
    key: "warmup",
    title: "Valendo!",
    message:
      "Olhos na cartela. O globo vai rodar e a rodada vai comecar agora.",
    label: "Abrir rodada",
  },
  {
    key: "attention",
    title: "Atencao no salao",
    message:
      "Segura a emocao. Confiram a cartela porque vem numero importante.",
    label: "Chamar atencao",
  },
  {
    key: "next_prize",
    title: "Proximo premio",
    message:
      "Preparar o salao para a proxima disputa. O narrador pode revelar o novo desafio.",
    label: "Proximo premio",
  },
  {
    key: "last_call",
    title: "Ultimas bolas",
    message:
      "A rodada esquentou. Todo mundo de olho porque pode sair bingo a qualquer instante.",
    label: "Ultimas bolas",
  },
  {
    key: "celebration",
    title: "Aplausos no salao",
    message:
      "Hora de vibrar junto. Palmas, foto e microfone aberto para anunciar o destaque da vez.",
    label: "Aplausos",
  },
];

type AdminSection =
  | "panel"
  | "rooms"
  | "match"
  | "players"
  | "prizes"
  | "themes"
  | "stats"
  | "tv"
  | "settings";

const ADMIN_NAV_ITEMS: Array<{
  id: AdminSection;
  label: string;
  detail: string;
  icon: LucideIcon;
}> = [
  { id: "panel", label: "Painel", detail: "Visao geral", icon: Home },
  { id: "rooms", label: "Salas", detail: "Criar e trocar", icon: MonitorCog },
  { id: "match", label: "Partida", detail: "Sorteio manual", icon: ListOrdered },
  { id: "players", label: "Jogadores", detail: "Mesa e ranking", icon: Users },
  { id: "prizes", label: "Premios", detail: "Rodadas e destaque", icon: Gift },
  { id: "themes", label: "Temas", detail: "Visual da sala", icon: Palette },
  { id: "stats", label: "Estatisticas", detail: "Pulso do evento", icon: BarChart3 },
  { id: "tv", label: "TV Mode", detail: "Telao e hype", icon: Tv },
  { id: "settings", label: "Configuracoes", detail: "Regras e QR", icon: Settings },
];

type CreatePrizeTarget = 3 | 4 | 5 | 7 | 10 | "full_house";

type CreatePrizeDraft = {
  clientKey: string;
  label: string;
  target: CreatePrizeTarget;
  prize: string;
  description: string;
  photoDataUrl?: string;
};

type CreateRoomSetupRequest = Omit<CreateRoomRequest, "prizeRounds"> & {
  prizeDrafts: CreatePrizeDraft[];
  firstPrizeKey: string;
  printCardsOnCreate: boolean;
  printableCards: GeneratePrintableCardsRequest;
};

const CREATE_PRIZE_TARGET_OPTIONS: Array<{
  value: CreatePrizeTarget;
  label: string;
  detail: string;
}> = [
  { value: 3, label: "3 numeros", detail: "Rodada relampago" },
  { value: 4, label: "4 numeros", detail: "Curta e divertida" },
  { value: 5, label: "5 numeros", detail: "Equilibrada" },
  { value: 7, label: "7 numeros", detail: "Mais disputa" },
  { value: 10, label: "10 numeros", detail: "Premio forte" },
  { value: "full_house", label: "Cheia", detail: "Cartela completa" },
];

function createDefaultRoomSetup(): CreateRoomSetupRequest {
  const prizeDrafts = [
    createRoomPrizeDraft(1, 3),
    createRoomPrizeDraft(2, 5),
    createRoomPrizeDraft(3, "full_house"),
  ];

  return {
    name: "",
    theme: "cassino",
    maxCardsPerPlayer: 3,
    allowAutoMark: true,
    allowManualMark: true,
    prizeDrafts,
    firstPrizeKey: prizeDrafts[0].clientKey,
    printCardsOnCreate: false,
    printableCards: {
      quantity: 24,
      cardsPerPage: 4,
      title: "",
    },
  };
}

function createRoomPrizeDraft(
  order: number,
  target: CreatePrizeTarget = 5,
): CreatePrizeDraft {
  return {
    clientKey: `create-prize-${Date.now()}-${order}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    label: createPrizeTargetLabel(target, order),
    target,
    prize:
      target === "full_house"
        ? "Premio final da noite"
        : `Premio ${createPrizeTargetText(target)}`,
    description:
      target === "full_house"
        ? "Encerramento da noite com o premio mais aguardado."
        : "Conte em poucas palavras o que o vencedor vai receber.",
  };
}

function buildCreateRoomRequest(
  setup: CreateRoomSetupRequest,
): CreateRoomRequest {
  const orderedPrizeDrafts = moveCreatePrizeToFirst(
    setup.prizeDrafts,
    setup.firstPrizeKey,
  );

  return {
    name: setup.name.trim(),
    theme: setup.theme,
    maxCardsPerPlayer: setup.maxCardsPerPlayer,
    allowAutoMark: setup.allowAutoMark,
    allowManualMark: setup.allowManualMark,
    prizeRounds: orderedPrizeDrafts.map(toCreatePrizeRoundRequest),
  };
}

function toCreatePrizeRoundRequest(
  draft: CreatePrizeDraft,
): CreatePrizeRoundRequest {
  const markedCount =
    typeof draft.target === "number" ? draft.target : undefined;

  return {
    label: draft.label.trim(),
    pattern: draft.target === "full_house" ? "full_house" : "marked_count",
    targetMarks: markedCount,
    prize: draft.prize.trim(),
    description: draft.description.trim() || undefined,
    photoDataUrl: draft.photoDataUrl,
  };
}

function moveCreatePrizeToFirst(
  drafts: CreatePrizeDraft[],
  firstPrizeKey: string,
) {
  const first = drafts.find((draft) => draft.clientKey === firstPrizeKey);
  if (!first) {
    return drafts;
  }

  return [
    first,
    ...drafts.filter((draft) => draft.clientKey !== firstPrizeKey),
  ];
}

function createPrizeTargetLabel(target: CreatePrizeTarget, order: number) {
  if (target === "full_house") {
    return "Cartela Cheia";
  }

  return order === 1
    ? `Premio ${target} numeros`
    : `Rodada ${target} numeros`;
}

function createPrizeTargetText(target: CreatePrizeTarget) {
  return target === "full_house" ? "cartela cheia" : `${target} numeros`;
}

function AdminSidebar({
  activeSection,
  currentRoom,
  highContrast,
  rooms,
  selectedRoomCode,
  soundEnabled,
  userName,
  onRefreshRooms,
  onSectionChange,
  onSelectRoom,
}: {
  activeSection: AdminSection;
  currentRoom: RoomSnapshot;
  highContrast: boolean;
  rooms: RoomSnapshot[];
  selectedRoomCode?: string;
  soundEnabled: boolean;
  userName: string;
  onRefreshRooms: () => void;
  onSectionChange: (section: AdminSection) => void;
  onSelectRoom: (roomCode: string) => void;
}) {
  return (
    <aside className="min-w-0 xl:sticky xl:top-5 xl:self-start">
      <GlassPanel className="relative overflow-hidden rounded-[24px] p-0">
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[var(--gold)]/60 to-transparent" />
        <div className="border-b border-[var(--border-color)] px-5 py-5 text-center">
          <p className="m-0 font-display text-3xl font-black leading-none text-gradient">
            BINGO
          </p>
          <p className="m-0 mt-1 text-[0.68rem] font-bold uppercase tracking-[0.38em] text-[var(--muted-text)]">
            Familiar
          </p>
          <span className="mt-2 inline-flex rounded-full border border-[var(--gold)]/45 bg-[var(--gold)]/15 px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.24em] text-[var(--gold)]">
            Premium
          </span>
        </div>

        <nav className="space-y-1.5 px-3 py-4" aria-label="Menu do painel">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;

            return (
              <button
                key={item.id}
                aria-pressed={active}
                className={`group flex w-full items-center gap-3 rounded-[16px] border px-3.5 py-3 text-left transition ${
                  active
                    ? "border-emerald-300/35 bg-emerald-400/18 text-white shadow-lg shadow-emerald-950/20"
                    : "border-transparent bg-transparent text-[var(--muted-text)] hover:border-[var(--gold)]/25 hover:bg-white/6 hover:text-[var(--text-color)]"
                }`}
                onClick={() => onSectionChange(item.id)}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border ${
                    active
                      ? "border-emerald-200/30 bg-emerald-400/20 text-emerald-100"
                      : "border-white/10 bg-white/5 text-[var(--muted-text)] group-hover:text-[var(--gold)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className="mt-0.5 block text-[0.68rem] text-[var(--muted-text)]">
                    {item.detail}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-[var(--border-color)] px-4 py-4">
          <div className="rounded-[18px] border border-[var(--gold)]/20 bg-[var(--gold)]/8 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
                Sala ativa
              </p>
              <button
                className="rounded-full border border-white/10 px-2 py-1 text-[0.58rem] uppercase tracking-[0.14em] text-[var(--muted-text)] transition hover:border-[var(--gold)]/40 hover:text-[var(--gold)]"
                type="button"
                onClick={onRefreshRooms}
              >
                Sync
              </button>
            </div>
            <p className="m-0 mt-2 truncate text-sm font-black text-[var(--text-color)]">
              {currentRoom.roomName}
            </p>
            <p className="m-0 mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted-text)]">
              {currentRoom.roomCode} - {matchStatusLabel(currentRoom.match.status)}
            </p>
          </div>

          {rooms.length > 1 ? (
            <div className="space-y-1">
              {rooms.slice(0, 3).map((room) => (
                <button
                  key={room.roomId}
                  className={`flex w-full items-center justify-between gap-2 rounded-[12px] border px-3 py-2 text-left text-xs transition ${
                    room.roomCode === selectedRoomCode
                      ? "border-[var(--gold)]/35 bg-[var(--gold)]/12 text-[var(--text-color)]"
                      : "border-white/10 bg-white/5 text-[var(--muted-text)] hover:border-[var(--gold)]/30"
                  }`}
                  type="button"
                  onClick={() => onSelectRoom(room.roomCode)}
                >
                  <span className="truncate font-semibold">{room.roomName}</span>
                  <span className="shrink-0 uppercase tracking-[0.12em]">
                    {room.roomCode}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--gold)]/35 bg-[var(--gold)]/15 text-sm font-black text-[var(--gold)]">
                {initialsFromName(userName)}
              </div>
              <div className="min-w-0">
                <p className="m-0 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--muted-text)]">
                  Anfitriao
                </p>
                <p className="m-0 truncate text-sm font-bold text-[var(--text-color)]">
                  {userName}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[0.66rem] font-bold uppercase tracking-[0.14em]">
            <span className="rounded-[12px] border border-emerald-300/20 bg-emerald-400/10 px-2 py-2 text-center text-emerald-200">
              Ao vivo
            </span>
            <span className="rounded-[12px] border border-white/10 bg-white/5 px-2 py-2 text-center text-[var(--muted-text)]">
              Som {soundEnabled ? "on" : "off"}
            </span>
            <span className="col-span-2 rounded-[12px] border border-white/10 bg-white/5 px-2 py-2 text-center text-[var(--muted-text)]">
              Contraste {highContrast ? "alto" : "premium"}
            </span>
          </div>
        </div>
      </GlassPanel>
    </aside>
  );
}

function AdminSectionHeader({
  description,
  label,
  title,
}: {
  description: string;
  label: string;
  title: string;
}) {
  return (
    <GlassPanel className="relative overflow-hidden rounded-[22px] p-5">
      <div className="absolute inset-y-0 right-0 w-44 bg-[radial-gradient(circle_at_center,rgba(228,180,95,0.22),transparent_68%)]" />
      <div className="relative">
        <p className="m-0 text-[0.68rem] font-black uppercase tracking-[0.24em] text-[var(--gold)]">
          {label}
        </p>
        <h2 className="m-0 mt-2 font-display text-[clamp(2rem,3vw,3rem)] leading-none text-[var(--text-color)]">
          {title}
        </h2>
        <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-text)]">
          {description}
        </p>
      </div>
    </GlassPanel>
  );
}

type PrizeRoundDraft = {
  clientKey: string;
  id?: string;
  label: string;
  pattern: PrizePattern;
  targetMarks?: number;
  order: number;
  prize: string;
  description: string;
  hasPhoto?: boolean;
  photoDataUrl?: string;
  removePhoto?: boolean;
  completedAt?: string;
};

function AdminEmptyRoomsPage({
  userName,
  disabled,
  error,
  onCreate,
}: {
  userName: string;
  disabled: boolean;
  error?: string;
  onCreate: (payload: CreateRoomSetupRequest) => Promise<void>;
}) {
  return (
    <main className="noise-layer min-h-screen px-4 py-6 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl items-center">
        <section className="w-full">
          <p className="m-0 text-[0.72rem] uppercase tracking-[0.3em] text-[var(--muted-text)]">
            Primeiro comando
          </p>
          <h1 className="m-0 mt-3 font-display text-[clamp(2.6rem,5vw,4.4rem)] leading-[0.95] text-gradient">
            {userName}, crie a primeira sala da operacao.
          </h1>
          <p className="m-0 mt-4 max-w-2xl text-sm leading-7 text-[var(--muted-text)]">
            O banco esta pronto para uso real. A primeira sala abre o painel, o
            QR dos jogadores e o modo TV.
          </p>
          <div className="mt-6">
            <AdminCreateRoomPanel disabled={disabled} onCreate={onCreate} />
          </div>
          {error ? (
            <p className="m-0 mt-4 text-sm text-rose-300">{error}</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function AdminCreateRoomPanel({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate: (payload: CreateRoomSetupRequest) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CreateRoomSetupRequest>(
    createDefaultRoomSetup,
  );
  const [photoBusyKey, setPhotoBusyKey] = useState<string>();
  const canSubmit =
    draft.name.trim().length >= 3 &&
    draft.prizeDrafts.length > 0 &&
    draft.prizeDrafts.every(
      (prize) =>
        prize.label.trim().length >= 2 &&
        prize.prize.trim().length >= 2 &&
        prize.description.trim().length >= 2,
    ) &&
    (!draft.printCardsOnCreate || draft.printableCards.quantity >= 1) &&
    !photoBusyKey;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || disabled) {
      return;
    }

    await onCreate({
      ...draft,
      name: draft.name.trim(),
      prizeDrafts: draft.prizeDrafts.map((prize) => ({
        ...prize,
        label: prize.label.trim(),
        prize: prize.prize.trim(),
        description: prize.description.trim(),
      })),
      printableCards: {
        ...draft.printableCards,
        title: draft.printableCards.title?.trim() || draft.name.trim(),
      },
    });
    setDraft((current) => ({
      ...current,
      name: "",
      printableCards: {
        ...current.printableCards,
        title: "",
      },
    }));
  }

  async function handlePrizePhotoChange(
    prizeKey: string,
    file?: File,
  ) {
    if (!file) {
      return;
    }

    setPhotoBusyKey(prizeKey);
    try {
      const photoDataUrl = await compressPrizePhoto(file);
      setDraft((current) => ({
        ...current,
        prizeDrafts: current.prizeDrafts.map((entry) =>
          entry.clientKey === prizeKey
            ? { ...entry, photoDataUrl }
            : entry,
          ),
      }));
    } catch (reason) {
      window.alert(
        readErrorMessage(reason, "Nao foi possivel preparar a foto do premio."),
      );
    } finally {
      setPhotoBusyKey(undefined);
    }
  }

  return (
    <GlassPanel className="rounded-[22px] p-5">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <p className="premium-label m-0">
            Setup da nova sala
          </p>
          <p className="m-0 mt-1 text-sm text-[var(--muted-text)]">
            Configure sala, cartelas, impressao e premio antes de abrir a
            partida.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-text)]">
              Nome da sala
            </span>
            <input
              value={draft.name}
              minLength={3}
              maxLength={60}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="w-full rounded-[14px] border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-color)] outline-none"
              placeholder="Bingo de sexta"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-text)]">
              Tema
            </span>
            <select
              value={draft.theme}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  theme: event.target.value as ThemeKey,
                }))
              }
              className="w-full rounded-[14px] border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-color)] outline-none"
            >
              {THEME_OPTIONS.map((theme) => (
                <option key={theme.key} value={theme.key}>
                  {theme.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-[18px] border border-[var(--border-color)] bg-white/5 p-4">
          <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-[var(--gold)]">
            Cartelas digitais
          </p>
          <p className="m-0 mt-1 text-xs leading-5 text-[var(--muted-text)]">
            Regras usadas quando o jogador entra pelo celular ou abre o QR da
            cartela impressa.
          </p>

          <div className="mt-4">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
              Cartelas por jogador
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((count) => (
                <Button
                  key={count}
                  type="button"
                  variant={
                    draft.maxCardsPerPlayer === count ? "secondary" : "ghost"
                  }
                  disabled={disabled}
                  className="px-3 py-2 text-xs"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      maxCardsPerPlayer: count,
                    }))
                  }
                >
                  {count}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant={draft.allowAutoMark ? "secondary" : "ghost"}
              disabled={disabled}
              className="px-3 py-2 text-xs"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  allowAutoMark:
                    current.allowAutoMark && !current.allowManualMark
                      ? true
                      : !current.allowAutoMark,
                }))
              }
            >
              Auto marcar {draft.allowAutoMark ? "sim" : "nao"}
            </Button>
            <Button
              type="button"
              variant={draft.allowManualMark ? "secondary" : "ghost"}
              disabled={disabled}
              className="px-3 py-2 text-xs"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  allowManualMark:
                    current.allowManualMark && !current.allowAutoMark
                      ? true
                      : !current.allowManualMark,
                }))
              }
            >
              Marcacao manual {draft.allowManualMark ? "sim" : "nao"}
            </Button>
          </div>
        </div>

        <div className="rounded-[18px] border border-[var(--border-color)] bg-white/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-[var(--gold)]">
                Cartelas impressas
              </p>
              <p className="m-0 mt-1 text-xs leading-5 text-[var(--muted-text)]">
                Gera cartelas fisicas com QR seguro ja vinculado a esta sala.
              </p>
            </div>
            <Button
              type="button"
              variant={draft.printCardsOnCreate ? "secondary" : "ghost"}
              disabled={disabled}
              className="px-3 py-2 text-xs"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  printCardsOnCreate: !current.printCardsOnCreate,
                }))
              }
            >
              {draft.printCardsOnCreate ? "Emitir ao criar" : "Emitir depois"}
            </Button>
          </div>

          {draft.printCardsOnCreate ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
                  Quantidade
                </span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={draft.printableCards.quantity}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      printableCards: {
                        ...current.printableCards,
                        quantity: Number(event.target.value),
                      },
                    }))
                  }
                  className="w-full rounded-[14px] border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-color)] outline-none"
                />
              </label>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
                  Por pagina
                </span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[2, 4, 6].map((count) => (
                    <Button
                      key={count}
                      type="button"
                      variant={
                        draft.printableCards.cardsPerPage === count
                          ? "secondary"
                          : "ghost"
                      }
                      disabled={disabled}
                      className="px-3 py-3 text-xs"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          printableCards: {
                            ...current.printableCards,
                            cardsPerPage: count as 2 | 4 | 6,
                          },
                        }))
                      }
                    >
                      {count}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-[18px] border border-[var(--border-color)] bg-[var(--gold)]/8 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-[var(--gold)]">
                Premios da sala
              </p>
              <p className="m-0 mt-1 text-xs leading-5 text-[var(--muted-text)]">
                Configure todos os premios agora e marque qual sera sorteado
                primeiro.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              className="gap-2 px-3 py-2 text-xs"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  prizeDrafts: [
                    ...current.prizeDrafts,
                    createRoomPrizeDraft(current.prizeDrafts.length + 1),
                  ],
                }))
              }
            >
              <Plus className="h-4 w-4" />
              Adicionar premio
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {draft.prizeDrafts.map((prize, index) => (
              <div
                key={prize.clientKey}
                className={`rounded-[18px] border p-3 ${
                  draft.firstPrizeKey === prize.clientKey
                    ? "border-[var(--gold)]/55 bg-[var(--gold)]/12"
                    : "border-[var(--border-color)] bg-white/5"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--muted-text)]">
                    {draft.firstPrizeKey === prize.clientKey
                      ? "Primeiro premio"
                      : `Premio ${index + 1}`}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={
                        draft.firstPrizeKey === prize.clientKey
                          ? "secondary"
                          : "ghost"
                      }
                      disabled={disabled}
                      className="px-3 py-2 text-xs"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          firstPrizeKey: prize.clientKey,
                        }))
                      }
                    >
                      Comecar por este
                    </Button>
                    {draft.prizeDrafts.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={disabled}
                        className="px-3 py-2 text-xs"
                        onClick={() =>
                          setDraft((current) => {
                            const nextPrizes = current.prizeDrafts.filter(
                              (entry) => entry.clientKey !== prize.clientKey,
                            );

                            return {
                              ...current,
                              prizeDrafts: nextPrizes,
                              firstPrizeKey:
                                current.firstPrizeKey === prize.clientKey
                                  ? nextPrizes[0]!.clientKey
                                  : current.firstPrizeKey,
                            };
                          })
                        }
                      >
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-3">
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
                      Titulo da rodada
                    </span>
                    <input
                      value={prize.label}
                      minLength={2}
                      maxLength={40}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          prizeDrafts: current.prizeDrafts.map((entry) =>
                            entry.clientKey === prize.clientKey
                              ? { ...entry, label: event.target.value }
                              : entry,
                          ),
                        }))
                      }
                      className="w-full rounded-[14px] border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-color)] outline-none"
                      placeholder="Ex.: Rodada relampago"
                    />
                  </label>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {CREATE_PRIZE_TARGET_OPTIONS.map((option) => (
                      <button
                        key={String(option.value)}
                        type="button"
                        disabled={disabled}
                        className={`rounded-[14px] border px-3 py-2 text-left transition ${
                          prize.target === option.value
                            ? "border-[var(--gold)]/55 bg-[var(--gold)]/18 text-[var(--text-color)]"
                            : "border-[var(--border-color)] bg-white/5 text-[var(--muted-text)] hover:border-[var(--gold)]/35"
                        }`}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            prizeDrafts: current.prizeDrafts.map((entry) =>
                              entry.clientKey === prize.clientKey
                                ? {
                                    ...entry,
                                    target: option.value,
                                    label:
                                      entry.label.trim().length > 0
                                        ? entry.label
                                        : createPrizeTargetLabel(
                                            option.value,
                                            index + 1,
                                          ),
                                  }
                                : entry,
                            ),
                          }))
                        }
                      >
                        <span className="block text-xs font-black">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-[0.62rem]">
                          {option.detail}
                        </span>
                      </button>
                    ))}
                  </div>

                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
                      Nome do premio
                    </span>
                    <input
                      value={prize.prize}
                      minLength={2}
                      maxLength={120}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          prizeDrafts: current.prizeDrafts.map((entry) =>
                            entry.clientKey === prize.clientKey
                              ? { ...entry, prize: event.target.value }
                              : entry,
                          ),
                        }))
                      }
                      className="w-full rounded-[14px] border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-color)] outline-none"
                      placeholder="Ex.: Air fryer, cesta especial, pix premiado"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
                      Breve descricao
                    </span>
                    <textarea
                      value={prize.description}
                      minLength={2}
                      maxLength={220}
                      rows={2}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          prizeDrafts: current.prizeDrafts.map((entry) =>
                            entry.clientKey === prize.clientKey
                              ? { ...entry, description: event.target.value }
                              : entry,
                          ),
                        }))
                      }
                      className="w-full resize-none rounded-[14px] border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-color)] outline-none"
                      placeholder="Ex.: Vai com acessorios, embalagem premium e entrega na hora."
                    />
                  </label>

                  <div className="rounded-[16px] border border-white/10 bg-white/5 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
                          Foto do premio
                        </p>
                        <p className="m-0 mt-1 text-xs leading-5 text-[var(--muted-text)]">
                          Tire a foto pelo celular para usar depois no telao.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-[14px] border border-[var(--gold)]/35 bg-[var(--gold)]/12 px-3 py-2 text-xs font-semibold text-[var(--text-color)]">
                          <Camera className="h-4 w-4" />
                          {prize.photoDataUrl ? "Trocar foto" : "Tirar foto"}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              void handlePrizePhotoChange(prize.clientKey, file);
                              event.target.value = "";
                            }}
                          />
                        </label>
                        {prize.photoDataUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={disabled || photoBusyKey === prize.clientKey}
                            className="px-3 py-2 text-xs"
                            onClick={() =>
                              setDraft((current) => ({
                                ...current,
                                prizeDrafts: current.prizeDrafts.map((entry) =>
                                  entry.clientKey === prize.clientKey
                                    ? { ...entry, photoDataUrl: undefined }
                                    : entry,
                                ),
                              }))
                            }
                          >
                            Remover foto
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {prize.photoDataUrl ? (
                      <img
                        src={prize.photoDataUrl}
                        alt={`Preview do premio ${prize.prize || prize.label}`}
                        className="mt-3 h-36 w-full rounded-[14px] object-cover"
                      />
                    ) : (
                      <p className="m-0 mt-3 text-xs text-[var(--muted-text)]">
                        A foto aparece aqui e depois entra no destaque do telao.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          className="w-full py-3"
          disabled={disabled || !canSubmit}
          type="submit"
        >
          {disabled
            ? "Criando..."
            : draft.printCardsOnCreate
              ? "Criar sala e emitir cartelas"
              : "Criar sala configurada"}
        </Button>
      </form>
    </GlassPanel>
  );
}

function AdminPrintableCardsPanel({
  room,
  disabled,
  loading,
  onGenerate,
  onVerify,
  verification,
  verificationLoading,
}: {
  room: RoomSnapshot;
  disabled: boolean;
  loading: boolean;
  onGenerate: (payload: GeneratePrintableCardsRequest) => Promise<void>;
  onVerify: (code: string) => Promise<void>;
  verification?: VerifyPrintableCardResponseDto;
  verificationLoading: boolean;
}) {
  const [draft, setDraft] = useState<GeneratePrintableCardsRequest>({
    quantity: 24,
    title: room.roomName,
    cardsPerPage: 4,
  });
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      title: current.title?.trim() ? current.title : room.roomName,
    }));
  }, [room.roomName]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      return;
    }

    await onGenerate({
      quantity: draft.quantity,
      title: draft.title?.trim() || room.roomName,
      cardsPerPage: draft.cardsPerPage ?? 4,
    });
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = verificationCode.trim();
    if (disabled || !code) {
      return;
    }

    await onVerify(code);
  }

  return (
    <GlassPanel className="rounded-lg p-5">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
            Cartelas impressas
          </p>
          <p className="m-0 mt-1 text-sm text-[var(--muted-text)]">
            Gere folhas A4 com QR individual para abrir a mesma cartela no
            celular.
          </p>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
            Titulo impresso
          </span>
          <input
            value={draft.title ?? ""}
            maxLength={80}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-white/10 bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-color)] outline-none"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
            Quantidade
          </span>
          <input
            type="number"
            min={1}
            max={120}
            value={draft.quantity}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                quantity: Number(event.target.value),
              }))
            }
            className="w-full rounded-lg border border-white/10 bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-color)] outline-none"
          />
        </label>

        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
            Cartelas por folha
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[2, 4, 6].map((count) => (
              <Button
                key={count}
                type="button"
                variant={draft.cardsPerPage === count ? "secondary" : "ghost"}
                disabled={disabled}
                className="px-3 py-2 text-xs"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    cardsPerPage: count as 2 | 4 | 6,
                  }))
                }
              >
                {count}
              </Button>
            ))}
          </div>
        </div>

        <Button
          className="w-full py-3"
          disabled={disabled || draft.quantity < 1 || draft.quantity > 120}
          type="submit"
        >
          {loading ? "Gerando..." : "Gerar PDF de impressao"}
        </Button>
      </form>

      <form
        className="mt-5 border-t border-white/10 pt-5"
        onSubmit={handleVerify}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[var(--accent-alt)]" />
          <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
            Verificar cartela
          </p>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={verificationCode}
            maxLength={300}
            placeholder="QR, codigo ou serial"
            onChange={(event) => setVerificationCode(event.target.value)}
            className="min-w-0 flex-1 rounded-[20px] border border-white/10 bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-color)] outline-none"
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={disabled || !verificationCode.trim()}
            className="px-4"
            title="Verificar autenticidade"
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Verificar</span>
          </Button>
        </div>
        {verification ? (
          <div
            className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
              verification.authentic
                ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                : "border-rose-300/25 bg-rose-300/10 text-rose-100"
            }`}
          >
            <p className="m-0 font-semibold">
              {verification.authentic ? "Cartela autentica" : "Nao autenticada"}
            </p>
            <p className="m-0 mt-1 text-xs opacity-80">
              {verification.card
                ? `${verification.card.serial} - ${verification.roomName}`
                : verification.reason}
            </p>
            {verification.card ? (
              <div className="mt-3 grid grid-cols-5 overflow-hidden rounded-[14px] border border-white/10 text-center text-[0.68rem] font-black">
                {["B", "I", "N", "G", "O"].map((letter) => (
                  <div key={letter} className="bg-white/10 py-1">
                    {letter}
                  </div>
                ))}
                {verification.card.cells.flat().map((cell) => (
                  <div
                    key={`${verification.card!.id}-${cell.row}-${cell.col}`}
                    className="border-t border-white/10 py-1"
                  >
                    {cell.value}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {verificationLoading ? (
          <p className="m-0 mt-3 text-xs text-[var(--muted-text)]">
            Conferindo no servidor...
          </p>
        ) : null}
      </form>
    </GlassPanel>
  );
}

function PrintableCardsPrintStudio({
  batch,
  onClose,
}: {
  batch: GeneratePrintableCardsResponse;
  onClose: () => void;
}) {
  const pages = chunk(batch.cards, batch.cardsPerPage);

  return (
    <section className="print-studio-shell fixed inset-0 z-50 overflow-auto bg-slate-950/95 px-4 py-5 text-slate-950">
      <div className="print-actions mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-3 text-[var(--text-color)]">
        <div>
          <p className="m-0 text-xs uppercase tracking-[0.24em] text-[var(--muted-text)]">
            Pronto para imprimir
          </p>
          <h2 className="m-0 mt-1 font-display text-3xl">
            {batch.cards.length} cartelas geradas
          </h2>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.print()}>
            Imprimir agora
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>

      <div className="print-area mx-auto max-w-5xl space-y-5">
        {pages.map((cards, pageIndex) => (
          <PrintableCardsPage
            key={`${batch.generatedAt}-${pageIndex}`}
            batch={batch}
            cards={cards}
            pageNumber={pageIndex + 1}
            totalPages={pages.length}
          />
        ))}
      </div>
    </section>
  );
}

function PrintableCardsPage({
  batch,
  cards,
  pageNumber,
  totalPages,
}: {
  batch: GeneratePrintableCardsResponse;
  cards: PrintableCardDto[];
  pageNumber: number;
  totalPages: number;
}) {
  const gridClass =
    batch.cardsPerPage === 2
      ? "grid-cols-1"
      : batch.cardsPerPage === 6
        ? "grid-cols-2"
        : "grid-cols-2";

  return (
    <div className="print-page mx-auto min-h-[297mm] w-[210mm] bg-white p-[9mm] shadow-2xl">
      <div className="mb-3 flex items-center justify-between border-b border-slate-300 pb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
        <span>{batch.title}</span>
        <span>
          {batch.roomCode} - pagina {pageNumber}/{totalPages}
        </span>
      </div>
      <div className={`grid ${gridClass} gap-3`}>
        {cards.map((card, index) => (
          <PrintableCard
            key={card.id}
            batch={batch}
            card={card}
            displayNumber={(pageNumber - 1) * batch.cardsPerPage + index + 1}
          />
        ))}
      </div>
    </div>
  );
}

function PrintableCard({
  batch,
  card,
  displayNumber,
}: {
  batch: GeneratePrintableCardsResponse;
  card: PrintableCardDto;
  displayNumber: number;
}) {
  const qrValue = resolvePrintableCardQrValue(card);

  return (
    <article className="print-card relative break-inside-avoid border border-dashed border-slate-500 bg-white p-3 text-slate-950">
      <span className="crop-mark crop-mark-tl" />
      <span className="crop-mark crop-mark-tr" />
      <span className="crop-mark crop-mark-bl" />
      <span className="crop-mark crop-mark-br" />

      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="m-0 text-[9px] uppercase tracking-[0.18em] text-slate-500">
            {batch.roomCode}
          </p>
          <h3 className="m-0 text-base font-black leading-tight text-slate-950">
            {batch.title}
          </h3>
        </div>
        <div className="text-right">
          <p className="m-0 text-[9px] uppercase tracking-[0.18em] text-slate-500">
            Cartela
          </p>
          <p className="m-0 font-black">
            {String(displayNumber).padStart(3, "0")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 border border-slate-950">
        {["B", "I", "N", "G", "O"].map((letter) => (
          <div
            key={letter}
            className="border-b border-r border-slate-950 bg-slate-950 py-1 text-center text-sm font-black tracking-[0.18em] text-white last:border-r-0"
          >
            {letter}
          </div>
        ))}
        {card.cells.flat().map((cell) => (
          <div
            key={`${card.id}-${cell.row}-${cell.col}`}
            className="flex min-h-[2.05rem] items-center justify-center border-b border-r border-slate-950 text-lg font-black last:border-r-0"
          >
            {cell.value === "FREE" ? (
              <span className="text-[0.62rem] uppercase tracking-[0.1em]">
                Livre
              </span>
            ) : (
              cell.value
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-end justify-between gap-2 text-[9px] uppercase tracking-[0.12em] text-slate-500">
        <div className="min-w-0">
          <span className="block font-black text-slate-700">{card.serial}</span>
          <span className="block truncate">
            {card.verificationCode
              ? `Codigo ${card.verificationCode}`
              : "Marque com caneta"}
          </span>
        </div>
        {qrValue ? (
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center justify-end gap-1 font-black text-slate-700">
                <QrCode className="h-3 w-3" />
                Digital
              </div>
              <p className="m-0 text-right leading-tight">Autentica</p>
            </div>
            <div className="rounded bg-white p-1">
              <QRCodeSVG value={qrValue} size={54} level="M" />
            </div>
          </div>
        ) : (
          <span>Marque com caneta</span>
        )}
      </div>
    </article>
  );
}

function resolvePrintableCardQrValue(card: PrintableCardDto) {
  if (card.digitalAccessCode && typeof window !== "undefined") {
    return `${window.location.origin}/card/${card.digitalAccessCode}`;
  }

  return card.qrValue ?? card.digitalUrl;
}

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

function clonePrizeRounds(rounds: PrizeRoundConfig[]): PrizeRoundDraft[] {
  return rounds.map((round) => toPrizeRoundDraft(round));
}

function toPrizeRoundDraft(round: PrizeRoundConfig): PrizeRoundDraft {
  return {
    clientKey: round.id,
    id: round.id,
    label: round.label,
    pattern: round.pattern,
    targetMarks:
      round.pattern === "marked_count"
        ? (round.targetMarks ?? 3)
        : round.targetMarks,
    order: round.order,
    prize: round.prize,
    description: round.description ?? "",
    hasPhoto: round.hasPhoto,
    completedAt: round.completedAt,
  };
}

function createPrizeRoundDraft(nextOrder: number): PrizeRoundDraft {
  return {
    clientKey: `draft-${crypto.randomUUID()}`,
    label: `Premio extra ${nextOrder}`,
    pattern: "marked_count",
    targetMarks: 3,
    order: nextOrder,
    prize: "Brinde surpresa para a mesa vencedora",
    description: "Conte rapidamente o que sera entregue para quem vencer.",
  };
}

function updateDraftRound(
  rounds: PrizeRoundDraft[],
  roundKey: string | undefined,
  patch: Partial<PrizeRoundDraft>,
) {
  return rounds.map((round) =>
    round.clientKey === roundKey ? { ...round, ...patch } : round,
  );
}

function removeDraftRound(rounds: PrizeRoundDraft[], roundKey: string) {
  return rounds.filter((round) => round.clientKey !== roundKey);
}

function moveDraftRoundToFront(rounds: PrizeRoundDraft[], roundKey: string) {
  const selected = rounds.find((round) => round.clientKey === roundKey);
  if (!selected) {
    return rounds;
  }

  return [
    selected,
    ...rounds.filter((round) => round.clientKey !== roundKey),
  ].map((round, index) => ({ ...round, order: index + 1 }));
}

function serializePrizeRoundDrafts(
  rounds: PrizeRoundDraft[],
): UpdatePrizeRoundsRequest {
  return {
    rounds: rounds.map((round) => ({
      id: round.id,
      label: round.label.trim(),
      pattern: round.pattern,
      targetMarks:
        round.pattern === "marked_count" ? (round.targetMarks ?? 3) : undefined,
      prize: round.prize.trim(),
      description: round.description.trim() || undefined,
      photoDataUrl: round.photoDataUrl,
      removePhoto: round.removePhoto || undefined,
    })),
  };
}

async function compressPrizePhoto(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);
    const { width, height } = fitImageInsideBox(
      image.naturalWidth,
      image.naturalHeight,
      1440,
    );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Nao foi possivel preparar a foto do premio.");
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function fitImageInsideBox(width: number, height: number, maxEdge: number) {
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const scale = Math.min(1, maxEdge / Math.max(safeWidth, safeHeight));

  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Nao foi possivel carregar a foto selecionada."));
    image.src = src;
  });
}

function prizeRuleLabel(
  round: Pick<PrizeRoundConfig, "pattern" | "targetMarks">,
) {
  if (round.pattern === "marked_count") {
    return `${round.targetMarks ?? 3} bola(s) na cartela`;
  }
  if (round.pattern === "single_line") {
    return "1 linha";
  }
  if (round.pattern === "double_line") {
    return "2 linhas";
  }
  return "Cartela cheia";
}

function nearWinAlertTitle(entry: ProximityEntry) {
  const count = Math.max(entry.cardsNearWin, 1);
  return count === 1 ? "1 cartela na boa" : `${count} cartelas na boa`;
}

function nearWinAlertMessage(entry: ProximityEntry) {
  if (entry.distance === 0) {
    return "Tem cartela batendo. Conferencia total na mesa!";
  }
  if (entry.distance === 1) {
    return "Falta 1 numero para sair bingo. Todo mundo de olho!";
  }
  if (entry.distance === 2) {
    return "Faltam 2 numeros para sair bingo. A rodada esquentou!";
  }
  return "A rodada esta chegando no ponto. Confiram as cartelas!";
}

function stagePresetIcon(key: StageMomentKey) {
  const className = "h-4 w-4";
  if (key === "warmup") {
    return <Sparkles className={className} />;
  }
  if (key === "attention") {
    return <Bell className={className} />;
  }
  if (key === "next_prize") {
    return <Trophy className={className} />;
  }
  if (key === "last_call") {
    return <Mic2 className={className} />;
  }
  if (key === "near_win") {
    return <Bell className={className} />;
  }
  return <PartyPopper className={className} />;
}

function AdminCommandOverview({ match }: { match: RoomSnapshot["match"] }) {
  const activeRound = match.prizeRounds.find(
    (entry) => entry.id === match.currentPrizeRoundId,
  );

  return (
    <GlassPanel className="rounded-lg border-white/6 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
            Visao rapida da mesa
          </p>
          <p className="m-0 mt-1 text-sm text-[var(--muted-text)]">
            Tudo que o anfitriao precisa bater o olho antes de chamar o proximo
            numero.
          </p>
        </div>
        <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted-text)]">
          {matchStatusLabel(match.status)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          icon={<Mic2 className="h-4 w-4" />}
          label="Premio ativo"
          value={activeRound?.label ?? "Encerrado"}
          detail={
            activeRound ? prizeRuleLabel(activeRound) : "Sem rodada aberta"
          }
        />
        <OverviewCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Bolas sorteadas"
          value={String(match.drawnNumbers.length).padStart(2, "0")}
          detail={match.currentDraw?.display ?? "Aguardando primeiro numero"}
        />
        <OverviewCard
          icon={<Trophy className="h-4 w-4" />}
          label="Jogadores"
          value={String(match.playersOnline)}
          detail={`${match.players.length} em tela`}
        />
        <OverviewCard
          icon={<Tv className="h-4 w-4" />}
          label="Telao"
          value={
            match.endedAt
              ? "Telao fechado"
              : match.tvStandby
                ? "Telao zerado"
                : match.recentDrawsVisible
                  ? "Ultimos numeros"
                  : (match.prizeShowcase?.label ??
                    match.stageMoment?.title ??
                    "Livre")
          }
          detail={
            match.endedAt
              ? "Partida encerrada na TV"
              : match.tvStandby
                ? "Aguardando nova chamada do admin"
                : match.recentDrawsVisible
                  ? "Lista aberta por comando"
                  : match.prizeShowcase
                    ? "Premio em destaque"
                    : match.stageMoment
                      ? "Momento do narrador"
                      : "Sem apresentacao fixa"
          }
        />
      </div>
    </GlassPanel>
  );
}

function AdminMetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[var(--border-color)] bg-white/5 px-4 py-4">
      <p className="m-0 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--gold)]">
        {label}
      </p>
      <p className="m-0 mt-2 truncate font-display text-2xl font-black leading-none text-[var(--text-color)]">
        {value}
      </p>
      <p className="m-0 mt-1 truncate text-xs text-[var(--muted-text)]">
        {detail}
      </p>
    </div>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--border-color)] bg-white/5 px-4 py-4">
      <div className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="m-0 mt-3 font-display text-[1.55rem] leading-none text-[var(--text-color)]">
        {value}
      </p>
      <p className="m-0 mt-2 text-xs text-[var(--muted-text)]">{detail}</p>
    </div>
  );
}

function AdminStageMomentsPanel({
  room,
  disabled,
  onResetTv,
  onSetRecentDraws,
  onSetStageMoment,
}: {
  room: RoomSnapshot;
  disabled: boolean;
  onResetTv: () => Promise<void>;
  onSetRecentDraws: (visible: boolean) => Promise<void>;
  onSetStageMoment: (payload: StageMomentRequest) => Promise<void>;
}) {
  return (
    <GlassPanel className="rounded-lg p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
            Central do telao
          </p>
          <p className="m-0 mt-1 text-sm text-[var(--muted-text)]">
            Dispare chamadas visuais para o narrador conduzir o publico ao vivo.
          </p>
        </div>
        <Button
          variant="ghost"
          type="button"
          disabled={disabled}
          className="gap-2 px-3 py-2 text-xs"
          onClick={() => void onResetTv()}
        >
          <RotateCcw className="h-4 w-4" />
          Zerar telao
        </Button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant={room.match.recentDrawsVisible ? "secondary" : "ghost"}
          disabled={disabled}
          className="gap-2 px-3 py-2 text-xs"
          onClick={() => void onSetRecentDraws(!room.match.recentDrawsVisible)}
        >
          <ListOrdered className="h-4 w-4" />
          {room.match.recentDrawsVisible
            ? "Ocultar ultimos"
            : "Mostrar ultimos"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          className="gap-2 px-3 py-2 text-xs"
          onClick={() => void onResetTv()}
        >
          <RotateCcw className="h-4 w-4" />
          Limpar TV
        </Button>
      </div>

      {room.match.stageMoment ? (
        <div className="mt-4 rounded-lg border border-amber-200/15 bg-amber-300/10 px-4 py-3">
          <p className="m-0 text-[0.65rem] uppercase tracking-[0.18em] text-amber-100">
            Momento no ar
          </p>
          <p className="m-0 mt-1 text-sm font-semibold text-[var(--text-color)]">
            {room.match.stageMoment.title}
          </p>
          <p className="m-0 mt-1 text-xs text-[var(--muted-text)]">
            {room.match.stageMoment.message}
          </p>
        </div>
      ) : null}

      {room.match.recentDrawsVisible ? (
        <div className="mt-4 rounded-lg border border-emerald-200/15 bg-emerald-300/10 px-4 py-3">
          <p className="m-0 text-[0.65rem] uppercase tracking-[0.18em] text-emerald-100">
            Ultimos numeros no ar
          </p>
          <p className="m-0 mt-1 text-sm font-semibold text-[var(--text-color)]">
            A TV esta mostrando os sorteios recentes por comando do admin.
          </p>
        </div>
      ) : room.match.endedAt ? (
        <div className="mt-4 rounded-lg border border-rose-200/15 bg-rose-300/10 px-4 py-3">
          <p className="m-0 text-[0.65rem] uppercase tracking-[0.18em] text-rose-100">
            Telao fechado
          </p>
          <p className="m-0 mt-1 text-sm font-semibold text-[var(--text-color)]">
            A partida foi encerrada e a TV esta mostrando a mensagem final.
          </p>
        </div>
      ) : room.match.tvStandby ? (
        <div className="mt-4 rounded-lg border border-cyan-200/15 bg-cyan-300/10 px-4 py-3">
          <p className="m-0 text-[0.65rem] uppercase tracking-[0.18em] text-cyan-100">
            Telao em espera
          </p>
          <p className="m-0 mt-1 text-sm font-semibold text-[var(--text-color)]">
            O painel da TV foi zerado e vai voltar quando entrar uma nova
            chamada.
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {STAGE_MOMENT_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            disabled={disabled}
            onClick={() =>
              void onSetStageMoment({
                visible: true,
                key: preset.key,
                title: preset.title,
                message: preset.message,
              })
            }
            className="group rounded-lg border border-white/8 bg-white/5 px-4 py-4 text-left transition hover:border-white/18 hover:bg-white/8 disabled:opacity-40"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-color)]">
                {stagePresetIcon(preset.key)}
                {preset.label}
              </span>
              <ArrowRight className="h-4 w-4 text-[var(--muted-text)] transition group-hover:translate-x-0.5" />
            </div>
            <p className="m-0 mt-2 text-sm text-[var(--text-color)]">
              {preset.title}
            </p>
            <p className="m-0 mt-1 text-xs leading-5 text-[var(--muted-text)]">
              {preset.message}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className="gap-2 px-3 py-2 text-xs"
          onClick={() =>
            void onSetStageMoment({
              visible: true,
              key: "next_prize",
              title: "Narrador em destaque",
              message:
                "Microfone aberto. Hora de apresentar o premio, brincar com o salao e aquecer a mesa.",
            })
          }
        >
          <Mic2 className="h-4 w-4" />
          Abrir microfone
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled || !room.match.stageMoment}
          className="gap-2 px-3 py-2 text-xs"
          onClick={() => void onSetStageMoment({ visible: false })}
        >
          <EyeOff className="h-4 w-4" />
          Limpar momento
        </Button>
      </div>
    </GlassPanel>
  );
}

type RoomSettingsPatch = Partial<
  Pick<RoomSnapshot, "allowAutoMark" | "allowManualMark" | "maxCardsPerPlayer">
>;

function AdminRoomSettingsPanel({
  room,
  disabled,
  onUpdate,
  onDelete,
}: {
  room: RoomSnapshot;
  disabled: boolean;
  onUpdate: (payload: RoomSettingsPatch) => Promise<void>;
  onDelete: () => void;
}) {
  return (
    <GlassPanel className="rounded-lg p-5">
      <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
        Regras da sala
      </p>
      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-white/8 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="m-0 text-sm font-semibold text-[var(--text-color)]">
                Auto marcar
              </p>
              <p className="m-0 mt-1 text-xs text-[var(--muted-text)]">
                {room.allowAutoMark
                  ? "Permitido para jogadores"
                  : "Bloqueado para jogadores"}
              </p>
            </div>
            <Button
              variant={room.allowAutoMark ? "secondary" : "ghost"}
              disabled={disabled}
              onClick={() => onUpdate({ allowAutoMark: !room.allowAutoMark })}
            >
              {room.allowAutoMark ? "Ligado" : "Desligado"}
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="m-0 text-sm font-semibold text-[var(--text-color)]">
                Marcacao manual
              </p>
              <p className="m-0 mt-1 text-xs text-[var(--muted-text)]">
                {room.allowManualMark
                  ? "Jogador pode marcar a propria cartela"
                  : "Somente automatico"}
              </p>
            </div>
            <Button
              variant={room.allowManualMark ? "secondary" : "ghost"}
              disabled={disabled}
              onClick={() =>
                onUpdate({ allowManualMark: !room.allowManualMark })
              }
            >
              {room.allowManualMark ? "Ligado" : "Desligado"}
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/5 p-3">
          <p className="m-0 text-sm font-semibold text-[var(--text-color)]">
            Cartelas por jogador
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((count) => (
              <Button
                key={count}
                variant={
                  room.maxCardsPerPlayer === count ? "secondary" : "ghost"
                }
                disabled={disabled || room.maxCardsPerPlayer === count}
                onClick={() => onUpdate({ maxCardsPerPlayer: count })}
              >
                {count}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-rose-200/15 bg-rose-300/10 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="m-0 text-sm font-semibold text-rose-100">
              Excluir sala
            </p>
            <p className="m-0 mt-1 text-xs text-[var(--muted-text)]">
              Remove a sala selecionada e todo o historico operacional dela.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            className="gap-2 px-3 py-2 text-xs"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>
    </GlassPanel>
  );
}

function AdminPlayersPanel({
  players,
  disabled,
  onToggleAutoMark,
  onRemove,
}: {
  players: PlayerSessionDto[];
  disabled: boolean;
  onToggleAutoMark: (player: PlayerSessionDto) => Promise<void>;
  onRemove: (player: PlayerSessionDto) => Promise<void>;
}) {
  return (
    <GlassPanel className="rounded-lg p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
          Jogadores
        </p>
        <span className="rounded-full bg-white/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted-text)]">
          {players.length} online
        </span>
      </div>
      <div className="mt-4 max-h-[28rem] space-y-3 overflow-auto pr-1">
        {players.length === 0 ? (
          <p className="m-0 rounded-lg border border-white/8 bg-white/5 px-4 py-4 text-sm text-[var(--muted-text)]">
            Nenhum jogador entrou nesta sala ainda.
          </p>
        ) : null}
        {players.map((player) => {
          const autoMarked = isPlayerAutoMarked(player);
          const bestDistance = player.cards.length
            ? Math.min(...player.cards.map((card) => card.marksNeeded))
            : 0;

          return (
            <div
              key={player.id}
              className="rounded-lg border border-white/8 bg-white/5 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-semibold text-[var(--text-color)]">
                    {player.avatar} {player.name}
                  </p>
                  <p className="m-0 mt-1 text-xs text-[var(--muted-text)]">
                    {player.cards.length} cartela(s) - melhor: {bestDistance}{" "}
                    faltam
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--muted-text)]">
                  {autoMarked ? "Auto" : "Manual"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  className="px-3 py-2 text-xs"
                  disabled={disabled}
                  onClick={() => onToggleAutoMark(player)}
                >
                  {autoMarked ? "Forcar manual" : "Ativar auto"}
                </Button>
                <Button
                  variant="ghost"
                  className="px-3 py-2 text-xs"
                  disabled={disabled}
                  onClick={() => {
                    if (window.confirm(`Remover ${player.name} desta sala?`)) {
                      void onRemove(player);
                    }
                  }}
                >
                  Remover
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}

function AdminPrizeControlPanel({
  match,
  disabled,
  onShowcase,
  onUpdate,
}: {
  match: RoomSnapshot["match"];
  disabled: boolean;
  onShowcase: (roundId: string | undefined, visible: boolean) => Promise<void>;
  onUpdate: (payload: UpdatePrizeRoundsRequest) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState(() =>
    clonePrizeRounds(match.prizeRounds),
  );

  useEffect(() => {
    setDrafts(clonePrizeRounds(match.prizeRounds));
  }, [match.prizeRounds]);

  const featuredIndex = match.prizeShowcase
    ? match.prizeRounds.findIndex(
        (round) => round.id === match.prizeShowcase?.roundId,
      )
    : -1;
  const nextRound =
    match.prizeRounds[
      featuredIndex >= 0 ? (featuredIndex + 1) % match.prizeRounds.length : 0
    ];

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onUpdate(serializePrizeRoundDrafts(drafts));
  }

  return (
    <GlassPanel className="rounded-lg p-5">
      <form className="space-y-4" onSubmit={handleSave}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
              Prêmios e telão
            </p>
            <p className="m-0 mt-1 text-sm text-[var(--muted-text)]">
              Configure regra, descrição e o que o animador mostra na TV.
            </p>
          </div>
          <Button
            type="submit"
            variant="secondary"
            disabled={disabled}
            className="px-3 py-2 text-xs"
          >
            Salvar
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            disabled={disabled || !nextRound}
            className="px-3 py-2 text-xs"
            onClick={() => nextRound && onShowcase(nextRound.id, true)}
          >
            Mostrar proximo
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || !match.prizeShowcase}
            className="px-3 py-2 text-xs"
            onClick={() => onShowcase(undefined, false)}
          >
            Ocultar telão
          </Button>
        </div>

        {match.prizeShowcase ? (
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-4 py-3">
            <p className="m-0 text-[0.65rem] uppercase tracking-[0.18em] text-emerald-100">
              No telão agora
            </p>
            <p className="m-0 mt-1 text-sm font-semibold text-[var(--text-color)]">
              {match.prizeShowcase.prize} - {prizeRuleLabel(match.prizeShowcase)}
            </p>
            <p className="m-0 mt-1 text-xs text-[var(--muted-text)]">
              {match.prizeShowcase.description ??
                `${match.prizeShowcase.label} pronta para o destaque.`}
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          {drafts.map((round, index) => (
            <div
              key={round.id}
              className="rounded-lg border border-white/8 bg-white/5 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--muted-text)]">
                  {round.completedAt ? "Concluida" : `Prêmio ${index + 1}`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={disabled}
                  className="px-3 py-2 text-xs"
                  onClick={() => onShowcase(round.id, true)}
                >
                  Mostrar
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                <input
                  value={round.label}
                  maxLength={40}
                  onChange={(event) =>
                    setDrafts((current) =>
                      updateDraftRound(current, round.id, {
                        label: event.target.value,
                      }),
                    )
                  }
                  className="w-full rounded-md border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-color)] outline-none"
                />
                <textarea
                  value={round.prize}
                  maxLength={120}
                  rows={2}
                  onChange={(event) =>
                    setDrafts((current) =>
                      updateDraftRound(current, round.id, {
                        prize: event.target.value,
                      }),
                    )
                  }
                  className="w-full resize-none rounded-md border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-color)] outline-none"
                />
                <div className="grid gap-2 sm:grid-cols-[1fr_5.5rem]">
                  <select
                    value={round.pattern}
                    onChange={(event) => {
                      const pattern = event.target.value as PrizePattern;
                      setDrafts((current) =>
                        updateDraftRound(current, round.id, {
                          pattern,
                          targetMarks:
                            pattern === "marked_count"
                              ? (round.targetMarks ?? 3)
                              : undefined,
                        }),
                      );
                    }}
                    className="w-full rounded-md border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-color)] outline-none"
                  >
                    {PRIZE_RULE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    disabled={round.pattern !== "marked_count" || disabled}
                    value={round.targetMarks ?? 3}
                    onChange={(event) =>
                      setDrafts((current) =>
                        updateDraftRound(current, round.id, {
                          targetMarks: Number(event.target.value),
                        }),
                      )
                    }
                    className="w-full rounded-md border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-color)] outline-none disabled:opacity-40"
                  />
                </div>
                <p className="m-0 text-xs text-[var(--muted-text)]">
                  Regra: {prizeRuleLabel(round)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </form>
    </GlassPanel>
  );
}

void AdminPrizeControlPanel;

function AdminPrizeCommandPanel({
  match,
  disabled,
  onShowcase,
  onUpdate,
  onResetTv,
}: {
  match: RoomSnapshot["match"];
  disabled: boolean;
  onShowcase: (roundId: string | undefined, visible: boolean) => Promise<void>;
  onUpdate: (payload: UpdatePrizeRoundsRequest) => Promise<void>;
  onResetTv: () => Promise<void>;
}) {
  const [drafts, setDrafts] = useState(() =>
    clonePrizeRounds(match.prizeRounds),
  );
  const [photoBusyKey, setPhotoBusyKey] = useState<string>();
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts(clonePrizeRounds(match.prizeRounds));
  }, [match.prizeRounds]);

  useEffect(() => {
    setPhotoPreviews((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([roundId]) =>
          match.prizeRounds.some((round) => round.id === roundId),
        ),
      ),
    );
  }, [match.prizeRounds]);

  const uncompletedRounds = match.prizeRounds.filter(
    (round) => !round.completedAt,
  );
  const featuredIndex = match.prizeShowcase
    ? uncompletedRounds.findIndex(
        (round) => round.id === match.prizeShowcase?.roundId,
      )
    : -1;
  const nextRound =
    uncompletedRounds[
      featuredIndex >= 0
        ? Math.min(featuredIndex + 1, Math.max(uncompletedRounds.length - 1, 0))
        : 0
    ];
  const canReorderPrizes =
    match.drawnNumbers.length === 0 && match.status !== "completed";

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onUpdate(serializePrizeRoundDrafts(drafts));
  }

  async function handleAddPrize() {
    const nextDrafts = [...drafts, createPrizeRoundDraft(drafts.length + 1)];
    setDrafts(nextDrafts);
    await onUpdate(serializePrizeRoundDrafts(nextDrafts));
  }

  async function handleRemovePrize(round: PrizeRoundDraft) {
    const nextDrafts = removeDraftRound(drafts, round.clientKey);
    if (nextDrafts.length === 0) {
      return;
    }

    setDrafts(nextDrafts);
    if (round.id) {
      await onUpdate(serializePrizeRoundDrafts(nextDrafts));
    }
  }

  async function handleMovePrizeFirst(round: PrizeRoundDraft) {
    const nextDrafts = moveDraftRoundToFront(drafts, round.clientKey);
    setDrafts(nextDrafts);
    await onUpdate(serializePrizeRoundDrafts(nextDrafts));
  }

  async function handlePrizePhotoCapture(
    round: PrizeRoundDraft,
    file?: File,
  ) {
    if (!file) {
      return;
    }

    setPhotoBusyKey(round.clientKey);
    try {
      const photoDataUrl = await compressPrizePhoto(file);
      const nextDrafts = updateDraftRound(drafts, round.clientKey, {
        photoDataUrl,
        hasPhoto: true,
        removePhoto: false,
      });

      setDrafts(nextDrafts);
      if (round.id) {
        setPhotoPreviews((current) => ({
          ...current,
          [round.id!]: photoDataUrl,
        }));
      }
      await onUpdate(serializePrizeRoundDrafts(nextDrafts));
    } catch (reason) {
      window.alert(
        readErrorMessage(reason, "Nao foi possivel salvar a foto do premio."),
      );
    } finally {
      setPhotoBusyKey(undefined);
    }
  }

  async function handleRemovePrizePhoto(round: PrizeRoundDraft) {
    try {
      const nextDrafts = updateDraftRound(drafts, round.clientKey, {
        photoDataUrl: undefined,
        hasPhoto: false,
        removePhoto: true,
      });

      setDrafts(nextDrafts);
      if (round.id) {
        setPhotoPreviews((current) => {
          const next = { ...current };
          delete next[round.id!];
          return next;
        });
      }
      await onUpdate(serializePrizeRoundDrafts(nextDrafts));
    } catch (reason) {
      window.alert(
        readErrorMessage(reason, "Nao foi possivel remover a foto do premio."),
      );
    }
  }

  return (
    <GlassPanel className="rounded-lg p-5">
      <form className="space-y-4" onSubmit={handleSave}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
              Premios da noite
            </p>
            <p className="m-0 mt-1 text-sm text-[var(--muted-text)]">
              Organize as rodadas, adicione premio novo e revele cada fase na
              hora certa.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              className="gap-2 px-3 py-2 text-xs"
              onClick={() => void handleAddPrize()}
            >
              <Plus className="h-4 w-4" />
              Adicionar premio
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={disabled}
              className="gap-2 px-3 py-2 text-xs"
            >
              <Sparkles className="h-4 w-4" />
              Salvar grade
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            type="button"
            disabled={disabled || !nextRound}
            className="gap-2 px-3 py-2 text-xs"
            onClick={() => nextRound && onShowcase(nextRound.id, true)}
          >
            <ArrowRight className="h-4 w-4" />
            Mostrar proximo
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || !match.prizeShowcase}
            className="gap-2 px-3 py-2 text-xs"
            onClick={() => onShowcase(undefined, false)}
          >
            <EyeOff className="h-4 w-4" />
            Ocultar premio
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            className="gap-2 px-3 py-2 text-xs"
            onClick={() => void onResetTv()}
          >
            <RotateCcw className="h-4 w-4" />
            Zerar telao
          </Button>
        </div>

        {match.prizeShowcase ? (
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-4 py-3">
            <p className="m-0 text-[0.65rem] uppercase tracking-[0.18em] text-emerald-100">
              No telao agora
            </p>
            <p className="m-0 mt-1 text-sm font-semibold text-[var(--text-color)]">
              {match.prizeShowcase.prize} - {prizeRuleLabel(match.prizeShowcase)}
            </p>
            <p className="m-0 mt-1 text-xs text-[var(--muted-text)]">
              {match.prizeShowcase.description ??
                `${match.prizeShowcase.label} pronta para o destaque.`}
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          {drafts.map((round, index) => (
            <div
              key={round.clientKey}
              className="rounded-lg border border-white/8 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--muted-text)]">
                  {round.completedAt
                    ? "Concluida"
                    : round.id
                      ? `Premio ${index + 1}`
                      : "Novo premio"}
                </span>
                <div className="flex flex-wrap gap-2">
                  {!round.completedAt ? (
                    <Button
                      type="button"
                      variant={index === 0 ? "secondary" : "ghost"}
                      disabled={disabled || !canReorderPrizes || index === 0}
                      className="gap-2 px-3 py-2 text-xs"
                      onClick={() => void handleMovePrizeFirst(round)}
                    >
                      Comecar por este
                    </Button>
                  ) : null}
                  {round.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={disabled}
                      className="gap-2 px-3 py-2 text-xs"
                      onClick={() => onShowcase(round.id, true)}
                    >
                      <Eye className="h-4 w-4" />
                      Mostrar
                    </Button>
                  ) : (
                    <span className="rounded-full border border-amber-200/15 bg-amber-300/10 px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-amber-100">
                      Salve para ativar
                    </span>
                  )}
                  {!round.completedAt && drafts.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={disabled}
                      className="gap-2 px-3 py-2 text-xs"
                      onClick={() => void handleRemovePrize(round)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 grid gap-3">
                <label className="block space-y-2">
                  <span className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
                    Titulo da rodada
                  </span>
                  <input
                    value={round.label}
                    maxLength={40}
                    onChange={(event) =>
                      setDrafts((current) =>
                        updateDraftRound(current, round.clientKey, {
                          label: event.target.value,
                        }),
                      )
                    }
                    className="w-full rounded-md border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-color)] outline-none"
                    placeholder="Ex.: Rodada relampago"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
                    Nome do premio
                  </span>
                  <input
                    value={round.prize}
                    maxLength={120}
                    onChange={(event) =>
                      setDrafts((current) =>
                        updateDraftRound(current, round.clientKey, {
                          prize: event.target.value,
                        }),
                      )
                    }
                    className="w-full rounded-md border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-color)] outline-none"
                    placeholder="Ex.: Air fryer, pix premiado, cesta especial"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
                    Breve descricao
                  </span>
                  <textarea
                    value={round.description}
                    maxLength={220}
                    rows={2}
                    onChange={(event) =>
                      setDrafts((current) =>
                        updateDraftRound(current, round.clientKey, {
                          description: event.target.value,
                        }),
                      )
                    }
                    className="w-full resize-none rounded-md border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-color)] outline-none"
                    placeholder="Ex.: Premio lacrado, entrega na hora e pronto para foto oficial."
                  />
                </label>
                <div className="grid gap-2 sm:grid-cols-[1fr_6.2rem]">
                  <select
                    value={round.pattern}
                    onChange={(event) => {
                      const pattern = event.target.value as PrizePattern;
                      setDrafts((current) =>
                        updateDraftRound(current, round.clientKey, {
                          pattern,
                          targetMarks:
                            pattern === "marked_count"
                              ? (round.targetMarks ?? 3)
                              : undefined,
                        }),
                      );
                    }}
                    className="w-full rounded-md border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-color)] outline-none"
                  >
                    {PRIZE_RULE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    disabled={round.pattern !== "marked_count" || disabled}
                    value={round.targetMarks ?? 3}
                    onChange={(event) =>
                      setDrafts((current) =>
                        updateDraftRound(current, round.clientKey, {
                          targetMarks: Number(event.target.value),
                        }),
                      )
                    }
                    className="w-full rounded-md border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-color)] outline-none disabled:opacity-40"
                  />
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="m-0 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
                        Foto do premio
                      </p>
                      <p className="m-0 mt-1 text-xs leading-5 text-[var(--muted-text)]">
                        Tire a foto pelo celular para mostrar esse premio no telao.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-[14px] border border-[var(--gold)]/35 bg-[var(--gold)]/12 px-3 py-2 text-xs font-semibold text-[var(--text-color)]">
                        <Camera className="h-4 w-4" />
                        {round.hasPhoto || round.photoDataUrl ? "Trocar foto" : "Tirar foto"}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            void handlePrizePhotoCapture(round, file);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      {round.hasPhoto || round.photoDataUrl ? (
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={disabled || photoBusyKey === round.clientKey}
                          className="px-3 py-2 text-xs"
                          onClick={() => void handleRemovePrizePhoto(round)}
                        >
                          Remover foto
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {round.id && photoPreviews[round.id] ? (
                    <img
                      src={photoPreviews[round.id]}
                      alt={`Preview do premio ${round.prize || round.label}`}
                      className="mt-3 h-36 w-full rounded-[14px] object-cover"
                    />
                  ) : round.photoDataUrl ? (
                    <img
                      src={round.photoDataUrl}
                      alt={`Preview do premio ${round.prize || round.label}`}
                      className="mt-3 h-36 w-full rounded-[14px] object-cover"
                    />
                  ) : (
                    <div className="mt-3 rounded-[14px] border border-dashed border-white/10 px-3 py-4 text-xs text-[var(--muted-text)]">
                      {round.hasPhoto
                        ? "Foto ja salva para este premio. Quando voce abrir o destaque, ela aparece no telao."
                        : "Ainda sem foto. Use a camera do celular para deixar o anuncio mais visual."}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="m-0 text-xs text-[var(--muted-text)]">
                    Regra: {prizeRuleLabel(round)}
                  </p>
                  <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--muted-text)]">
                    Ordem {index + 1}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>
    </GlassPanel>
  );
}

function AdminHistoryPanel({
  items,
  loading,
  onRefresh,
}: {
  items: AdminHistoryItemDto[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <GlassPanel className="rounded-lg p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
          Registro operacional
        </p>
        <Button
          variant="ghost"
          className="px-3 py-2 text-xs"
          disabled={loading}
          onClick={onRefresh}
        >
          Atualizar
        </Button>
      </div>
      <div className="mt-4 max-h-[24rem] space-y-3 overflow-auto pr-1">
        {items.length === 0 ? (
          <p className="m-0 rounded-lg border border-white/8 bg-white/5 px-4 py-4 text-sm text-[var(--muted-text)]">
            {loading
              ? "Carregando trilha operacional..."
              : "Nenhum evento administrativo registrado ainda."}
          </p>
        ) : null}
        {items.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="rounded-lg border border-white/8 bg-white/5 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--muted-text)]">
                {historyActionLabel(item)}
              </span>
              <span className="shrink-0 text-[0.68rem] text-[var(--muted-text)]">
                {formatHistoryDate(item.occurredAt)}
              </span>
            </div>
            <p className="m-0 mt-2 text-sm font-semibold leading-5 text-[var(--text-color)]">
              {item.summary}
            </p>
            <p className="m-0 mt-1 text-xs text-[var(--muted-text)]">
              {item.actorName ?? actorTypeLabel(item.actorType)}
            </p>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

function isPlayerAutoMarked(player: PlayerSessionDto) {
  return player.cards.length > 0 && player.cards.every((card) => card.autoMark);
}

function matchStatusLabel(status: RoomSnapshot["match"]["status"]) {
  const labels: Record<RoomSnapshot["match"]["status"], string> = {
    completed: "Encerrada",
    draft: "Preparacao",
    live: "Ao vivo",
    paused: "Pausada",
  };

  return labels[status];
}

function initialsFromName(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "A";
}

function historyActionLabel(item: AdminHistoryItemDto) {
  if (item.type === "win_claim") {
    return "Bingo";
  }

  const labels: Record<string, string> = {
    "draw.corrected": "Correcao",
    "draw.created": "Sorteio",
    "draw.replayed": "Replay",
    "draw.reverted": "Reversao",
    "match.completed": "Encerramento",
    "match.paused": "Pausa",
    "match.resumed": "Retomada",
    "match.started": "Inicio",
    "player.removed": "Jogador",
    "player.updated": "Jogador",
    "prize.showcase.hidden": "Telão",
    "prize.showcase.presented": "Telão",
    "prize_rounds.updated": "Prêmios",
    "room.deleted": "Sala",
    "room.updated": "Sala",
    "stage.moment.hidden": "Telao",
    "stage.moment.presented": "Telao",
    "tv.presentation.reset": "Telao",
    "tv.recent_draws.hidden": "Telao",
    "tv.recent_draws.presented": "Telao",
  };

  return labels[item.action] ?? item.action;
}

function actorTypeLabel(actorType: AdminHistoryItemDto["actorType"]) {
  const labels: Record<AdminHistoryItemDto["actorType"], string> = {
    admin: "Administrador",
    player: "Jogador",
    system: "Sistema",
  };

  return labels[actorType];
}

function formatHistoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function buildFreshRoomName() {
  return `Nova sala ${new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date())}`;
}

function readErrorMessage(reason: unknown, fallback: string) {
  if (!(reason instanceof Error)) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(reason.message) as {
      message?: unknown;
      error?: unknown;
    };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(" ");
    }
    if (typeof parsed.message === "string") {
      return parsed.message;
    }
    if (typeof parsed.error === "string") {
      return parsed.error;
    }
  } catch {
    // The API client stores plain text in Error.message when the response is not JSON.
  }

  return reason.message || fallback;
}

function isStaleAuthError(reason: unknown) {
  if (!(reason instanceof Error)) {
    return false;
  }

  try {
    const parsed = JSON.parse(reason.message) as {
      message?: unknown;
      statusCode?: unknown;
    };
    const message = Array.isArray(parsed.message)
      ? parsed.message.join(" ")
      : typeof parsed.message === "string"
        ? parsed.message
        : "";

    return (
      parsed.statusCode === 401 ||
      message.includes("Usuario nao encontrado") ||
      message.includes("Tenant nao encontrado")
    );
  } catch {
    return reason.message.includes("Unauthorized");
  }
}
