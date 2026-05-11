import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, GlassPanel } from '@bingo/ui';
import type {
  DrawEventDto,
  PrizeShowcaseDto,
  StageMomentDto,
  StageMomentKey,
} from '@bingo/contracts';
import { CelebrationLayer } from '@/components/celebration-layer';
import { DrawSpotlight } from '@/components/draw-spotlight';
import { LoadingState } from '@/components/loading-state';
import { QRJoinPanel } from '@/components/qr-join-panel';
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
  const stageMomentToken = room?.match.stageMoment
    ? [
        room.match.stageMoment.key,
        room.match.stageMoment.title,
        room.match.stageMoment.message,
        room.match.stageMoment.expiresAt ?? 'fixed',
      ].join(':')
    : undefined;
  const [expiredStageMomentToken, setExpiredStageMomentToken] =
    useState<string>();
  const speechCues =
    room && !room.match.tvStandby && !room.match.endedAt
      ? room.match.announcements.filter((cue) => cue.tone === 'winner')
      : [];

  useThemeShell(room?.theme, false);
  useSpeechAnnouncer(speechCues, voiceEnabled);

  useEffect(() => {
    setExpiredStageMomentToken(undefined);

    if (!stageMomentToken || !room?.match.stageMoment?.expiresAt) {
      return;
    }

    const remaining =
      new Date(room.match.stageMoment.expiresAt).getTime() - Date.now();
    if (remaining <= 0) {
      setExpiredStageMomentToken(stageMomentToken);
      return;
    }

    const timer = window.setTimeout(() => {
      setExpiredStageMomentToken(stageMomentToken);
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [room?.match.stageMoment?.expiresAt, stageMomentToken]);

  if (loading || !room) {
    return <LoadingState label="Carregando modo TV" />;
  }

  const isMatchEnded = Boolean(room.match.endedAt);
  const isPresentationIdle = isMatchEnded || room.match.tvStandby;
  const visibleStageMoment =
    stageMomentToken && stageMomentToken !== expiredStageMomentToken
      ? room.match.stageMoment
      : undefined;
  const alertMoment =
    visibleStageMoment?.key === 'near_win' ? visibleStageMoment : undefined;
  const stageMoment =
    visibleStageMoment?.key !== 'near_win' ? visibleStageMoment : undefined;
  const isRecentDrawsOpen =
    !isPresentationIdle && room.match.recentDrawsVisible && !stageMoment;
  const gridClassName = isPresentationIdle
    ? 'mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1180px] gap-6'
    : 'mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1600px] gap-6 xl:grid-cols-[1.55fr_0.95fr]';

  return (
    <main className="noise-layer min-h-screen px-6 py-6">
      <CelebrationLayer
        winnerKey={
          isPresentationIdle
            ? undefined
            : room.match.lastWinner?.triggeredByDrawId
        }
      />
      <WinnerOverlay
        winner={isPresentationIdle ? undefined : room.match.lastWinner}
        currentDraw={room.match.currentDraw?.display}
      />
      <AnimatePresence>
        {alertMoment ? <NearWinStageAlert moment={alertMoment} /> : null}
      </AnimatePresence>

      <div className={gridClassName}>
        <section className="space-y-5">
          <GlassPanel className="rounded-[34px] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="m-0 text-[0.72rem] uppercase tracking-[0.3em] text-[var(--muted-text)]">
                  Modo TV / Telão
                </p>
                <h1 className="m-0 mt-2 font-display text-4xl text-gradient">
                  {room.roomName}
                </h1>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  void document.documentElement.requestFullscreen?.()
                }
              >
                Tela cheia
              </Button>
            </div>
          </GlassPanel>

          <AnimatePresence mode="wait">
            {isMatchEnded ? (
              <TvEndedDisplay roomName={room.roomName} />
            ) : room.match.tvStandby ? (
              <TvStandbyDisplay
                roomName={room.roomName}
                roomCode={room.roomCode}
              />
            ) : isRecentDrawsOpen ? (
              <TvRecentDrawsDisplay draws={room.match.recentDraws} />
            ) : stageMoment ? (
              <StageMomentDisplay key={stageMomentToken} moment={stageMoment} />
            ) : null}
          </AnimatePresence>

          {!isPresentationIdle && room.match.prizeShowcase ? (
            <PrizeShowcaseDisplay prize={room.match.prizeShowcase} />
          ) : null}

          {!isPresentationIdle && !isRecentDrawsOpen && !stageMoment ? (
            <DrawSpotlight draw={room.match.currentDraw} large />
          ) : null}

          {false ? (
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
                <Button
                  variant="ghost"
                  onClick={() => setVoiceEnabled((current) => !current)}
                >
                  Narrador {voiceEnabled ? 'ligado' : 'desligado'}
                </Button>
              </div>
              <RecentDrawsRail draws={[]} />
            </GlassPanel>
          ) : null}
        </section>

        {!isMatchEnded ? (
          <aside className="grid gap-5">
            <QRJoinPanel room={room} />
          </aside>
        ) : null}
      </div>
    </main>
  );
}

function NearWinStageAlert({ moment }: { moment: StageMomentDto }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 px-6 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="relative w-full max-w-6xl overflow-hidden rounded-[42px] border border-amber-200/25 bg-[linear-gradient(135deg,rgba(255,224,140,0.26),rgba(8,17,26,0.96)_42%,rgba(89,255,208,0.18))] px-8 py-14 text-center shadow-[0_36px_120px_rgba(255,224,140,0.16)]"
        initial={{ scale: 0.86, y: 28 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: -18 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18 }}
      >
        <motion.div
          className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,transparent,#ffe08c,#59ffd0,transparent)]"
          animate={{ x: ['-100%', '100%'] }}
          transition={{
            duration: 1.6,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/10 blur-3xl"
          animate={{ scale: [0.9, 1.18, 0.96], opacity: [0.38, 0.62, 0.42] }}
          transition={{
            duration: 2.4,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
        />
        <div className="relative">
          <p className="m-0 text-[0.9rem] uppercase tracking-[0.42em] text-amber-100">
            Radar da boa
          </p>
          <h2 className="m-0 mt-5 font-display text-[clamp(4.2rem,11vw,10rem)] leading-none text-gradient">
            {moment.title}
          </h2>
          <p className="m-0 mx-auto mt-6 max-w-4xl text-[clamp(1.4rem,3vw,2.6rem)] font-black leading-tight text-white">
            {moment.message}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TvRecentDrawsDisplay({ draws }: { draws: DrawEventDto[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.98 }}
      transition={{ duration: 0.36, ease: 'easeOut' }}
    >
      <GlassPanel className="relative overflow-hidden rounded-[34px] border-white/8 bg-[linear-gradient(135deg,rgba(8,17,26,0.96),rgba(18,46,57,0.94))] p-8">
        <div className="relative">
          <p className="m-0 text-[0.78rem] uppercase tracking-[0.32em] text-[var(--muted-text)]">
            Ultimos numeros
          </p>
          <h2 className="m-0 mt-3 font-display text-[clamp(3rem,7vw,6.2rem)] leading-none text-gradient">
            Sorteios recentes
          </h2>
          <div className="mt-8">
            {draws.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                {draws.slice(0, 10).map((draw, index) => (
                  <motion.div
                    key={draw.id}
                    className="rounded-[28px] border border-white/10 bg-white/8 px-5 py-6 text-center shadow-[0_18px_60px_rgba(89,255,208,0.08)]"
                    initial={{ opacity: 0, y: 14, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.24, delay: index * 0.04 }}
                  >
                    <p className="m-0 font-display text-[clamp(2.4rem,5vw,4.4rem)] font-black leading-none text-[var(--text-color)]">
                      {draw.display.replace(/^([A-Z])/, '$1 ')}
                    </p>
                    <p className="m-0 mt-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--muted-text)]">
                      {index === 0 ? 'Mais recente' : `#${draw.sequence}`}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="m-0 text-2xl font-semibold text-[var(--muted-text)]">
                Nenhum numero foi registrado ainda.
              </p>
            )}
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function TvEndedDisplay({ roomName }: { roomName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.98 }}
      transition={{ duration: 0.38, ease: 'easeOut' }}
    >
      <GlassPanel className="relative overflow-hidden rounded-[34px] border-white/8 bg-[linear-gradient(135deg,rgba(35,22,48,0.96),rgba(8,17,26,0.96))] p-10">
        <div className="relative text-center">
          <p className="m-0 text-[0.78rem] uppercase tracking-[0.32em] text-[var(--muted-text)]">
            Telao fechado
          </p>
          <h2 className="m-0 mt-4 font-display text-[clamp(3.5rem,7vw,6.8rem)] leading-[0.92] text-gradient">
            Partida encerrada
          </h2>
          <p className="m-0 mt-4 text-[clamp(1.1rem,2vw,1.7rem)] font-semibold leading-tight text-[var(--text-color)]">
            Obrigado por jogar em {roomName}. O anfitriao ja fechou esta rodada.
          </p>
          <p className="m-0 mx-auto mt-5 max-w-3xl text-base leading-7 text-[var(--muted-text)]">
            O historico segue salvo para conferencia no painel admin. O telao
            fica limpo para a proxima chamada.
          </p>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function TvStandbyDisplay({
  roomName,
  roomCode,
}: {
  roomName: string;
  roomCode: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.98 }}
      transition={{ duration: 0.38, ease: 'easeOut' }}
    >
      <GlassPanel className="relative overflow-hidden rounded-[34px] border-white/8 bg-[linear-gradient(135deg,rgba(12,34,49,0.96),rgba(8,17,26,0.96))] p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(89,255,208,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,224,140,0.1),transparent_28%)]" />
        <div className="relative text-center">
          <p className="m-0 text-[0.78rem] uppercase tracking-[0.32em] text-[var(--muted-text)]">
            Telao em espera
          </p>
          <h2 className="m-0 mt-4 font-display text-[clamp(3.4rem,7vw,6.3rem)] leading-[0.92] text-gradient">
            {roomName}
          </h2>
          <p className="m-0 mt-4 text-[clamp(1.1rem,2vw,1.6rem)] font-semibold text-[var(--text-color)]">
            Painel zerado pelo anfitriao. Aguardando a proxima chamada no
            microfone.
          </p>
          <div className="mt-7 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm uppercase tracking-[0.28em] text-[var(--muted-text)]">
            Sala {roomCode}
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function StageMomentDisplay({ moment }: { moment: StageMomentDto }) {
  const theme = stageMomentTheme(moment.key);

  return (
    <motion.div
      initial={{ opacity: 0, y: 26, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.98 }}
      transition={{ duration: 0.42, ease: 'easeOut' }}
    >
      <GlassPanel
        className="relative overflow-hidden rounded-[34px] border-white/8 p-8"
        style={{
          background: theme.background,
        }}
      >
        <motion.div
          className="absolute inset-0 opacity-40"
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
          style={{
            backgroundImage:
              'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.22) 35%, transparent 70%)',
            backgroundSize: '220% 100%',
          }}
        />
        <motion.div
          className="absolute -left-12 top-1/2 h-44 w-44 rounded-full blur-3xl"
          animate={{ scale: [0.9, 1.2, 0.95], opacity: [0.22, 0.34, 0.2] }}
          transition={{
            duration: 5.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
          style={{ backgroundColor: theme.glow }}
        />
        <motion.div
          className="absolute -right-10 top-10 h-36 w-36 rounded-full blur-3xl"
          animate={{ scale: [1, 1.18, 1], opacity: [0.16, 0.28, 0.16] }}
          transition={{
            duration: 4.8,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
          style={{ backgroundColor: '#ffffff' }}
        />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-4xl">
            <p className="m-0 text-[0.78rem] uppercase tracking-[0.32em] text-white/75">
              {theme.eyebrow}
            </p>
            <h2 className="m-0 mt-3 font-display text-[clamp(3.2rem,7vw,6.5rem)] leading-[0.92] text-white">
              {moment.title}
            </h2>
            <p className="m-0 mt-4 max-w-3xl text-[clamp(1.1rem,2.2vw,1.9rem)] font-semibold leading-tight text-white/90">
              {moment.message}
            </p>
          </div>
          <div className="rounded-[28px] border border-white/14 bg-slate-950/35 px-6 py-5 text-center backdrop-blur">
            <p className="m-0 text-[0.7rem] uppercase tracking-[0.24em] text-white/70">
              Momento do narrador
            </p>
            <p className="m-0 mt-2 font-display text-3xl text-white">
              {theme.callout}
            </p>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function PrizeShowcaseDisplay({ prize }: { prize: PrizeShowcaseDto }) {
  return (
    <GlassPanel className="relative overflow-hidden rounded-[34px] border-amber-200/20 bg-[linear-gradient(135deg,rgba(255,214,128,0.2),rgba(89,255,208,0.08))] p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="m-0 text-[0.74rem] uppercase tracking-[0.32em] text-amber-100">
            Prêmio em destaque
          </p>
          <h2 className="m-0 mt-3 font-display text-[clamp(2.8rem,6vw,5.6rem)] leading-none text-gradient">
            {prize.label}
          </h2>
          <p className="m-0 mt-4 max-w-3xl text-2xl font-bold leading-tight text-[var(--text-color)]">
            {prize.prize}
          </p>
        </div>
        <div className="rounded-[28px] border border-white/12 bg-slate-950/45 px-6 py-5 text-center">
          <p className="m-0 text-[0.7rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
            Regra para ganhar
          </p>
          <p className="m-0 mt-2 font-display text-3xl font-bold text-amber-100">
            {prizeRuleLabel(prize)}
          </p>
        </div>
      </div>
    </GlassPanel>
  );
}

function prizeRuleLabel(
  prize: Pick<PrizeShowcaseDto, 'pattern' | 'targetMarks'>,
) {
  if (prize.pattern === 'marked_count') {
    return `${prize.targetMarks ?? 3} bolas`;
  }
  if (prize.pattern === 'single_line') {
    return '1 linha';
  }
  if (prize.pattern === 'double_line') {
    return '2 linhas';
  }
  return 'Cartela cheia';
}

function stageMomentTheme(key: StageMomentKey) {
  if (key === 'warmup') {
    return {
      eyebrow: 'Abertura da rodada',
      callout: 'Preparar cartelas',
      glow: '#59ffd0',
      background:
        'linear-gradient(135deg, rgba(27,66,59,0.96), rgba(7,19,29,0.92) 55%, rgba(89,255,208,0.26))',
    };
  }
  if (key === 'attention') {
    return {
      eyebrow: 'Atenção geral',
      callout: 'Silencio e foco',
      glow: '#ffe08c',
      background:
        'linear-gradient(135deg, rgba(102,78,21,0.96), rgba(17,18,23,0.92) 58%, rgba(255,224,140,0.22))',
    };
  }
  if (key === 'next_prize') {
    return {
      eyebrow: 'Proxima chamada',
      callout: 'Hora do anuncio',
      glow: '#7dd3fc',
      background:
        'linear-gradient(135deg, rgba(13,45,68,0.96), rgba(7,19,29,0.92) 58%, rgba(125,211,252,0.24))',
    };
  }
  if (key === 'last_call') {
    return {
      eyebrow: 'Clima de decisao',
      callout: 'Pode sair bingo',
      glow: '#fb7185',
      background:
        'linear-gradient(135deg, rgba(94,24,41,0.96), rgba(17,18,23,0.92) 58%, rgba(251,113,133,0.22))',
    };
  }
  if (key === 'near_win') {
    return {
      eyebrow: 'Radar da boa',
      callout: 'Olho nas cartelas',
      glow: '#ffe08c',
      background:
        'linear-gradient(135deg, rgba(102,78,21,0.96), rgba(7,19,29,0.92) 58%, rgba(89,255,208,0.2))',
    };
  }
  return {
    eyebrow: 'Clima de festa',
    callout: 'Aplausos no salao',
    glow: '#f9a8d4',
    background:
      'linear-gradient(135deg, rgba(87,24,78,0.96), rgba(17,18,23,0.92) 58%, rgba(249,168,212,0.22))',
  };
}
