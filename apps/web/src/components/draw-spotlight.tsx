import { motion } from 'framer-motion';
import type { DrawEventDto } from '@bingo/contracts';
import { formatDisplay } from '@/lib/format';
import { GlassPanel } from '@bingo/ui';

interface DrawSpotlightProps {
  draw?: DrawEventDto;
  large?: boolean;
}

export function DrawSpotlight({ draw, large }: DrawSpotlightProps) {
  const display = formatDisplay(draw?.display);
  const [letter, number] = display.includes(' ') ? display.split(' ') : ['-', '--'];

  if (large) {
    return (
      <GlassPanel className="tv-premium-draw relative min-h-[42rem] overflow-hidden rounded-[28px] p-8 text-center">
        <div className="tv-premium-stars" />
        <motion.div
          key={`leak-${draw?.id ?? 'empty'}`}
          className="tv-premium-light-leak"
          initial={{ opacity: 0, x: '-58%', rotate: -18 }}
          animate={{ opacity: [0, 0.72, 0], x: '62%', rotate: -18 }}
          transition={{ duration: 1.12, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          key={`flash-${draw?.id ?? 'empty'}`}
          className="tv-premium-flash"
          initial={{ opacity: 0.86, scale: 0.25 }}
          animate={{ opacity: 0, scale: 1.42 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />

        {STAGE_SPARKS.map((spark) => (
          <motion.span
            key={`${draw?.id ?? 'empty'}-${spark.id}`}
            className="tv-premium-spark"
            style={{
              left: `${spark.left}%`,
              top: `${spark.top}%`,
              backgroundColor: spark.color,
              boxShadow: `0 0 ${spark.glow}px ${spark.color}`,
            }}
            initial={{ opacity: 0, y: 24, scale: 0.5, rotate: spark.rotate }}
            animate={{
              opacity: [0, 1, 0],
              y: [24, -spark.float, -spark.float - 18],
              scale: [0.5, 1, 0.65],
              rotate: spark.rotate + 80,
            }}
            transition={{ duration: spark.duration, delay: spark.delay, ease: 'easeOut' }}
          />
        ))}

        <p className="premium-label relative z-10 m-0">Numero sorteado</p>
        <motion.div
          key={draw?.id ?? 'empty-large'}
          initial={{ opacity: 0, y: 34, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.62, type: 'spring', stiffness: 115, damping: 16 }}
          className="relative z-10 mt-5 flex flex-col items-center"
        >
          <div className="tv-premium-symbol">
            <motion.div
              className="tv-premium-orbit"
              initial={{ opacity: 0, scale: 0.86 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.25, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.div
              className="tv-premium-disc"
              initial={{ filter: 'brightness(1.8) blur(4px)' }}
              animate={{ filter: 'brightness(1) blur(0px)' }}
              transition={{ duration: 0.46, ease: 'easeOut' }}
            >
            <motion.span
                className="tv-premium-letter"
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 170, damping: 13 }}
            >
              {letter}
            </motion.span>
            </motion.div>
          </div>

          <motion.p
            className="tv-premium-number m-0 mt-4 font-display font-black leading-none tracking-normal"
            initial={{ opacity: 0, y: 38, scale: 0.78 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: [0.78, 1.06, 1],
            }}
            transition={{ duration: 0.68, delay: 0.06, ease: 'easeOut' }}
          >
            {number}
          </motion.p>

          <motion.div
            className="tv-premium-podium relative -mt-3 h-24 w-72 md:w-[25rem]"
            initial={{ opacity: 0, y: 18, scale: 0.78 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <svg
              className="tv-premium-ring-field"
              viewBox="0 0 560 150"
              aria-hidden="true"
            >
              <defs>
                <filter id="tv-ring-glow" x="-40%" y="-80%" width="180%" height="260%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="tv-ring-stroke" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#6d2cff" stopOpacity="0.08" />
                  <stop offset="42%" stopColor="#f5d7ff" stopOpacity="0.95" />
                  <stop offset="62%" stopColor="#c86cff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#6d2cff" stopOpacity="0.08" />
                </linearGradient>
              </defs>
              <motion.ellipse
                className="tv-premium-svg-ring tv-premium-svg-ring-back"
                cx="280"
                cy="72"
                rx="190"
                ry="27"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.45, strokeDashoffset: [0, -760] }}
                transition={{
                  pathLength: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.45 },
                  strokeDashoffset: {
                    duration: 8.4,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'linear',
                  },
                }}
              />
              <motion.ellipse
                className="tv-premium-svg-ring tv-premium-svg-ring-mid"
                cx="280"
                cy="82"
                rx="232"
                ry="31"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.78, strokeDashoffset: [0, 920] }}
                transition={{
                  pathLength: { duration: 0.62, delay: 0.08, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.45, delay: 0.08 },
                  strokeDashoffset: {
                    duration: 6.6,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'linear',
                  },
                }}
              />
              <motion.ellipse
                className="tv-premium-svg-ring tv-premium-svg-ring-front"
                cx="280"
                cy="94"
                rx="266"
                ry="35"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1, strokeDashoffset: [0, -1060] }}
                transition={{
                  pathLength: { duration: 0.72, delay: 0.14, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.5, delay: 0.14 },
                  strokeDashoffset: {
                    duration: 5.2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'linear',
                  },
                }}
              />
              <motion.ellipse
                className="tv-premium-svg-ring tv-premium-svg-ring-hot"
                cx="280"
                cy="94"
                rx="266"
                ry="35"
                initial={{ opacity: 0, strokeDashoffset: 0 }}
                animate={{ opacity: [0.25, 1, 0.34], strokeDashoffset: [0, -760] }}
                transition={{
                  opacity: {
                    duration: 1.9,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  },
                  strokeDashoffset: {
                    duration: 2.2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'linear',
                  },
                }}
              />
            </svg>
            <motion.div
              className="tv-premium-podium-core"
              initial={{ opacity: 0, scaleX: 0.35 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.55, delay: 0.14, ease: 'easeOut' }}
            />
            <motion.div
              className="tv-premium-podium-glint"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.3] }}
              transition={{ duration: 0.82, delay: 0.16, ease: 'easeOut' }}
            />
          </motion.div>
        </motion.div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className="relative overflow-hidden rounded-[22px] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="premium-label m-0">Sorteio atual</p>
          <motion.div
            key={draw?.id ?? 'empty'}
            initial={{ opacity: 0.3, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.32 }}
            className="mt-3 flex items-center gap-4"
          >
            <span className={`bingo-letter-chip ${letterToneClass(letter)} flex h-20 w-20 items-center justify-center rounded-[18px] font-display text-5xl font-black text-white`}>
              {letter}
            </span>
            <span className="font-display text-7xl font-black leading-none text-white">
              {number}
            </span>
          </motion.div>
        </div>
        <div className="hidden rounded-[18px] border border-[var(--border-color)] bg-white/5 px-4 py-3 text-right md:block">
          <p className="m-0 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--muted-text)]">
            Origem
          </p>
          <p className="m-0 mt-1 text-sm font-semibold text-[var(--text-color)]">
            Globo fisico
          </p>
        </div>
      </div>
    </GlassPanel>
  );
}

const STAGE_SPARKS = [
  { id: 1, left: 19, top: 22, color: '#e4b45f', glow: 18, float: 54, rotate: -22, duration: 1.45, delay: 0.04 },
  { id: 2, left: 28, top: 39, color: '#54b6ff', glow: 14, float: 38, rotate: 16, duration: 1.2, delay: 0.14 },
  { id: 3, left: 36, top: 25, color: '#c86cff', glow: 22, float: 60, rotate: 34, duration: 1.55, delay: 0.08 },
  { id: 4, left: 48, top: 18, color: '#fff7ea', glow: 16, float: 44, rotate: -10, duration: 1.18, delay: 0.22 },
  { id: 5, left: 62, top: 30, color: '#e4b45f', glow: 18, float: 52, rotate: 24, duration: 1.42, delay: 0.11 },
  { id: 6, left: 73, top: 43, color: '#54b6ff', glow: 14, float: 38, rotate: -32, duration: 1.25, delay: 0.19 },
  { id: 7, left: 80, top: 24, color: '#c86cff', glow: 22, float: 58, rotate: 12, duration: 1.62, delay: 0.05 },
  { id: 8, left: 22, top: 70, color: '#ff6257', glow: 14, float: 34, rotate: 42, duration: 1.12, delay: 0.24 },
  { id: 9, left: 67, top: 73, color: '#fff7ea', glow: 16, float: 38, rotate: -18, duration: 1.28, delay: 0.28 },
  { id: 10, left: 54, top: 60, color: '#69f283', glow: 14, float: 46, rotate: 28, duration: 1.36, delay: 0.17 },
] as const;

function letterToneClass(letter: string) {
  const normalized = letter.toLowerCase();
  return ['b', 'i', 'n', 'g', 'o'].includes(normalized)
    ? `bingo-letter-${normalized}`
    : 'bingo-letter-g';
}
