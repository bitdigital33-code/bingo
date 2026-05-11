import { startTransition, useEffect, useEffectEvent, useState } from 'react';
import { io } from 'socket.io-client';
import type { RoomSnapshot } from '@bingo/contracts';
import { SOCKET_URL } from '@/lib/env';

function isRoomSnapshot(value: unknown): value is RoomSnapshot {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'roomCode' in value &&
    'match' in value,
  );
}

export function useRoomChannel(
  roomCode: string | undefined,
  loader: (() => Promise<RoomSnapshot>) | undefined,
) {
  const [room, setRoom] = useState<RoomSnapshot>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const applySnapshot = useEffectEvent((snapshot: RoomSnapshot) => {
    startTransition(() => {
      setRoom(snapshot);
      setError(undefined);
      setLoading(false);
    });
  });

  useEffect(() => {
    if (!roomCode || !loader) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setRoom(undefined);

    void loader()
      .then((snapshot) => {
        if (!active) {
          return;
        }
        applySnapshot(snapshot);
      })
      .catch((reason) => {
        if (!active) {
          return;
        }
        setError(
          reason instanceof Error ? reason.message : 'Falha ao carregar sala.',
        );
        setLoading(false);
      });

    const socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
      query: {
        roomCode,
      },
    });

    const handler = (payload: unknown) => {
      if (isRoomSnapshot(payload)) {
        applySnapshot(payload);
      }
    };

    socket.on('room.snapshot', handler);
    socket.on('draw.created', handler);
    socket.on('draw.corrected', handler);
    socket.on('match.status.changed', handler);
    socket.on('player.presence.updated', handler);
    socket.on('prize.rounds.updated', handler);
    socket.on('prize.showcase.changed', handler);
    socket.on('stage.moment.changed', handler);
    socket.on('tv.recent-draws.changed', handler);
    socket.on('tv.presentation.reset', handler);

    const connectTimer = window.setTimeout(() => {
      if (active) {
        socket.connect();
      }
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(connectTimer);
      socket.close();
    };
  }, [loader, roomCode]);

  return {
    room,
    loading,
    error,
    setRoom,
  };
}
