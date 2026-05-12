import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink } from 'lucide-react';
import type { RoomSnapshot } from '@bingo/contracts';
import { Button, GlassPanel } from '@bingo/ui';

export function QRJoinPanel({
  room,
  showTvButton = true,
}: {
  room: RoomSnapshot;
  showTvButton?: boolean;
}) {
  const joinUrl =
    typeof window === 'undefined'
      ? room.joinUrl
      : `${window.location.origin}/join/${room.roomCode}`;

  return (
    <GlassPanel className="rounded-[22px] p-5">
      <p className="premium-label m-0">Entre na sala</p>
      <div className="mt-4 grid items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="rounded-[18px] border border-[var(--gold)]/30 bg-white p-3 shadow-[0_18px_44px_rgba(228,180,95,0.16)]">
          <QRCodeSVG value={joinUrl} size={150} />
        </div>
        <div className="min-w-0">
          <p className="m-0 font-display text-3xl font-black text-[var(--text-color)]">
            {room.roomCode}
          </p>
          <p className="m-0 mt-2 text-sm leading-6 text-[var(--muted-text)]">
            Aponte a camera do celular para entrar na partida.
          </p>
          <p className="m-0 mt-3 break-all text-xs text-[var(--accent-alt)]">
            {joinUrl}
          </p>
        </div>
      </div>
      {showTvButton ? (
        <Button
          variant="secondary"
          className="mt-4 w-full gap-2"
          onClick={() => window.open(`/room/${room.roomCode}/tv`, '_blank', 'noopener')}
        >
          <ExternalLink className="h-4 w-4" />
          Abrir modo TV
        </Button>
      ) : null}
    </GlassPanel>
  );
}
