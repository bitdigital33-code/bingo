import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, GlassPanel } from '@bingo/ui';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { LoadingState } from '@/components/loading-state';
import { ProximityTicker } from '@/components/proximity-ticker';
import { api } from '@/lib/api';
import { savePlayerIdentity } from '@/lib/session';
import { useRoomChannel } from '@/hooks/use-room-channel';
import { useThemeShell } from '@/hooks/use-theme-shell';

export function JoinRoomPage() {
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const [form, setForm] = useState({
    name: '',
    avatar: '🎄',
    cardsRequested: 1,
  });
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string>();
  const loader = useMemo(
    () => (roomCode ? () => api.getRoomState(roomCode) : undefined),
    [roomCode],
  );
  const { room, loading, error: roomError } = useRoomChannel(roomCode, loader);

  useThemeShell(room?.theme, false);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomCode) {
      return;
    }

    setJoining(true);
    setError(undefined);

    try {
      const response = await api.joinRoom(roomCode, form);
      savePlayerIdentity({
        playerId: response.player.id,
        playerToken: response.playerToken,
        roomCode,
      });
      navigate(`/room/${roomCode}/player`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nao foi possivel entrar.');
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return <LoadingState label="Preparando entrada da sala" />;
  }

  if (!room) {
    return (
      <main className="noise-layer flex min-h-screen items-center justify-center px-6 py-8">
        <GlassPanel className="max-w-xl rounded-[34px] p-6 text-center">
          <p className="m-0 text-sm uppercase tracking-[0.3em] text-[var(--muted-text)]">
            Sala indisponivel
          </p>
          <h1 className="m-0 mt-3 font-display text-4xl text-[var(--text-color)]">
            Nao consegui abrir esta sala.
          </h1>
          <p className="m-0 mt-4 text-sm leading-6 text-[var(--muted-text)]">
            {roomError ?? 'Confira se o celular esta na mesma rede Wi-Fi do computador.'}
          </p>
        </GlassPanel>
      </main>
    );
  }

  return (
    <main className="noise-layer min-h-screen px-6 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5">
          <p className="m-0 text-sm uppercase tracking-[0.34em] text-[var(--muted-text)]">
            Entrar na sala
          </p>
          <h1 className="m-0 font-display text-[clamp(2.7rem,6vw,5rem)] leading-[0.94] text-gradient">
            {room.roomName}
          </h1>
          <p className="m-0 max-w-xl text-lg text-[var(--muted-text)]">
            Você entra pelo celular, recebe cartelas digitais e acompanha o bingo em sincronia com o telão.
          </p>
          <AnnouncementBanner cues={room.match.announcements} />
          <ProximityTicker entries={room.match.proximityBoard.slice(0, 4)} />
        </section>

        <GlassPanel className="rounded-[38px] p-6 md:p-8">
          <form className="space-y-4" onSubmit={handleJoin}>
            <h2 className="m-0 font-display text-3xl text-[var(--text-color)]">Entrar agora</h2>
            <Field label="Seu nome" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <Field label="Avatar" value={form.avatar} onChange={(value) => setForm((current) => ({ ...current, avatar: value }))} />
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-text)]">
                Quantas cartelas
              </span>
              <select
                value={form.cardsRequested}
                onChange={(event) =>
                  setForm((current) => ({ ...current, cardsRequested: Number(event.target.value) }))
                }
                className="w-full rounded-[22px] border border-white/10 bg-[var(--surface-strong)] px-4 py-4 text-base text-[var(--text-color)] outline-none"
              >
                {Array.from({ length: room.maxCardsPerPlayer }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value} cartela(s)
                  </option>
                ))}
              </select>
            </label>
            {error ? <p className="m-0 text-sm text-rose-300">{error}</p> : null}
            <Button className="w-full py-4 text-base" disabled={joining || form.name.trim().length < 2}>
              {joining ? 'Entrando...' : 'Receber cartelas'}
            </Button>
          </form>
        </GlassPanel>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-text)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[22px] border border-white/10 bg-[var(--surface-strong)] px-4 py-4 text-base text-[var(--text-color)] outline-none"
      />
    </label>
  );
}
