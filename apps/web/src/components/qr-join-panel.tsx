import { QRCodeSVG } from 'qrcode.react';
import type { RoomSnapshot } from '@bingo/contracts';
import { Button, GlassPanel } from '@bingo/ui';

export function QRJoinPanel({ room }: { room: RoomSnapshot }) {
  const joinUrl =
    typeof window === 'undefined'
      ? room.joinUrl
      : `${window.location.origin}/join/${room.roomCode}`;

  return (
    <GlassPanel className="rounded-[30px] p-5 text-center">
      <p className="m-0 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--muted-text)]">
        Entre na sala
      </p>
      <div className="mt-4 flex justify-center">
        <div className="rounded-[28px] bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <QRCodeSVG value={joinUrl} size={160} />
        </div>
      </div>
      <p className="m-0 mt-4 font-display text-2xl text-[var(--text-color)]">{room.roomCode}</p>
      <p className="m-0 mt-2 break-all text-sm text-[var(--muted-text)]">{joinUrl}</p>
      <Button
        variant="secondary"
        className="mt-4 w-full"
        onClick={() => window.open(`/room/${room.roomCode}/tv`, '_blank', 'noopener')}
      >
        Abrir modo TV
      </Button>
    </GlassPanel>
  );
}
