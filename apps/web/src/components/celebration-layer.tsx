import { useEffect, useRef, useState } from 'react';
import Confetti from 'react-confetti';

interface CelebrationLayerProps {
  winnerKey?: string;
}

export function CelebrationLayer({ winnerKey }: CelebrationLayerProps) {
  const [active, setActive] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const initializedRef = useRef(false);
  const lastWinnerKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const update = () =>
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastWinnerKeyRef.current = winnerKey;
      return;
    }

    if (!winnerKey) {
      lastWinnerKeyRef.current = undefined;
      setActive(false);
      return;
    }

    if (lastWinnerKeyRef.current === winnerKey) {
      return;
    }

    lastWinnerKeyRef.current = winnerKey;
    setActive(true);
    const timer = window.setTimeout(() => setActive(false), 7000);
    return () => window.clearTimeout(timer);
  }, [winnerKey]);

  if (!active) {
    return null;
  }

  return (
    <>
      <Confetti
        recycle={false}
        numberOfPieces={260}
        width={size.width}
        height={size.height}
        colors={['#ff7a59', '#59ffd0', '#ffe08c', '#ffffff']}
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16),transparent_45%)]" />
    </>
  );
}
