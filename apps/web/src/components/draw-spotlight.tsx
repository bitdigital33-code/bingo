import { motion } from 'framer-motion';
import type { DrawEventDto } from '@bingo/contracts';
import { formatDisplay } from '@/lib/format';
import { GlassPanel } from '@bingo/ui';

interface DrawSpotlightProps {
  draw?: DrawEventDto;
  large?: boolean;
}

export function DrawSpotlight({ draw, large }: DrawSpotlightProps) {
  return (
    <GlassPanel className="relative overflow-hidden rounded-[34px] border-white/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6">
      <div className="floating-orb left-[-3rem] top-[-4rem] h-40 w-40 bg-[var(--glow-color)]" />
      <div className="floating-orb bottom-[-4rem] right-[-2rem] h-48 w-48 bg-[rgba(255,122,89,0.2)]" />
      <p className="m-0 text-[0.72rem] uppercase tracking-[0.28em] text-[var(--muted-text)]">
        Sorteio atual
      </p>
      <motion.div
        key={draw?.id ?? 'empty'}
        initial={{ opacity: 0.3, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        className={`mt-4 font-display font-bold tracking-[0.08em] text-gradient ${
          large ? 'text-[clamp(5rem,14vw,10rem)]' : 'text-[clamp(3rem,8vw,6rem)]'
        }`}
      >
        {formatDisplay(draw?.display)}
      </motion.div>
      <p className="m-0 mt-2 max-w-lg text-sm text-[var(--muted-text)]">
        Painel inteligente sincronizado com o globo fisico, pronto para telão, celular e sala inteira.
      </p>
    </GlassPanel>
  );
}
