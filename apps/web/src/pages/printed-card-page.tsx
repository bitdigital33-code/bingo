import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type {
  PrintableBingoCellDto,
  PrintedCardDigitalResponseDto,
  PrizePattern,
} from "@bingo/contracts";
import { BadgeCheck, RotateCcw } from "lucide-react";
import { Button, GlassPanel } from "@bingo/ui";
import { DrawSpotlight } from "@/components/draw-spotlight";
import { LoadingState } from "@/components/loading-state";
import { ApiError, api } from "@/lib/api";
import { useRoomChannel } from "@/hooks/use-room-channel";
import { useThemeShell } from "@/hooks/use-theme-shell";

export function PrintedCardPage() {
  const { accessCode } = useParams();
  const [data, setData] = useState<PrintedCardDigitalResponseDto>();
  const [error, setError] = useState<string>();
  const [errorTitle, setErrorTitle] = useState("QR nao autenticado");
  const [loading, setLoading] = useState(true);
  const [manualMarks, setManualMarks] = useState<string[]>(() =>
    loadPrintedCardMarks(accessCode),
  );

  useEffect(() => {
    if (!accessCode) {
      setError("QR invalido.");
      setErrorTitle("QR invalido");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    setErrorTitle("QR nao autenticado");
    void api
      .getPrintedCard(accessCode)
      .then((response) => {
        setData(response);
        setManualMarks(loadPrintedCardMarks(accessCode));
      })
      .catch((reason) => {
        const resolved = resolvePrintedCardError(reason);
        setErrorTitle(resolved.title);
        setError(resolved.message);
      })
      .finally(() => setLoading(false));
  }, [accessCode]);

  const roomLoader = useMemo(
    () => (data?.roomCode ? () => api.getRoomState(data.roomCode) : undefined),
    [data?.roomCode],
  );
  const { room } = useRoomChannel(data?.roomCode, roomLoader);
  useThemeShell(data?.theme ?? room?.theme, false);

  const drawnSet = useMemo(
    () =>
      new Set((room?.match.drawnNumbers ?? []).map((entry) => entry.display)),
    [room?.match.drawnNumbers],
  );
  const manualSet = useMemo(() => new Set(manualMarks), [manualMarks]);

  if (loading) {
    return <LoadingState label="Abrindo cartela digital" />;
  }

  if (!data || error) {
    return (
      <main className="noise-layer flex min-h-screen items-center px-4 py-6">
        <GlassPanel className="mx-auto max-w-xl rounded-[30px] p-6 text-center">
          <p className="m-0 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--muted-text)]">
            Cartela digital
          </p>
          <h1 className="m-0 mt-3 font-display text-3xl text-[var(--text-color)]">
            {errorTitle}
          </h1>
          <p className="m-0 mt-3 text-sm leading-6 text-[var(--muted-text)]">
            {error ?? "Esta cartela nao foi emitida pelo painel."}
          </p>
        </GlassPanel>
      </main>
    );
  }

  const activeRound = room?.match.prizeRounds.find(
    (round) => round.id === room.match.currentPrizeRoundId,
  );
  const marks = data.card.cells.map((row) =>
    row.map((cell) => isCellMarked(cell, drawnSet, manualSet)),
  );
  const marksNeeded = countMissingForPattern(
    marks,
    activeRound?.pattern ?? "full_house",
    activeRound?.targetMarks,
  );

  function updateManualMarks(next: Set<string>) {
    const serialized = [...next];
    setManualMarks(serialized);
    savePrintedCardMarks(accessCode, serialized);
  }

  function handleToggle(cell: PrintableBingoCellDto) {
    if (cell.value === "FREE") {
      return;
    }

    const key = buildCellKey(cell);
    const next = new Set(manualSet);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    updateManualMarks(next);
  }

  return (
    <main className="noise-layer min-h-screen px-4 py-5 md:px-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <GlassPanel className="rounded-[34px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="m-0 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--muted-text)]">
                {data.tenantName}
              </p>
              <h1 className="m-0 mt-2 font-display text-3xl text-[var(--text-color)]">
                {data.roomName}
              </h1>
              <p className="m-0 mt-2 text-sm text-[var(--muted-text)]">
                Cartela {data.card.serial}
              </p>
            </div>
            <div className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
              <BadgeCheck className="mr-2 inline h-4 w-4" />
              Autentica
            </div>
          </div>
        </GlassPanel>

        <DrawSpotlight draw={room?.match.currentDraw} />

        <GlassPanel className="space-y-4 rounded-[30px] p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--muted-text)]">
                Cartela digital
              </p>
              <p className="m-0 mt-1 text-sm font-semibold text-[var(--text-color)]">
                {marksNeeded === 0
                  ? "Padrao completo"
                  : `Faltam ${marksNeeded} numero(s)`}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => updateManualMarks(new Set())}
              title="Limpar marcas manuais"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="sr-only">Limpar marcas</span>
            </Button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {["B", "I", "N", "G", "O"].map((letter) => (
              <div
                key={letter}
                className="rounded-2xl bg-white/8 py-3 text-center font-display text-sm font-bold tracking-[0.26em] text-[var(--text-color)]"
              >
                {letter}
              </div>
            ))}

            {data.card.cells.flat().map((cell) => {
              const marked = isCellMarked(cell, drawnSet, manualSet);
              return (
                <button
                  key={`${data.card.id}-${cell.row}-${cell.col}`}
                  type="button"
                  className={`flex min-h-[4.75rem] items-center justify-center rounded-[22px] border px-1 text-center font-display text-2xl font-bold transition ${
                    marked
                      ? "border-transparent bg-[linear-gradient(135deg,rgba(255,122,89,0.86),rgba(89,255,208,0.86))] text-slate-950 shadow-[0_22px_40px_rgba(89,255,208,0.16)]"
                      : "border-white/10 bg-white/5 text-[var(--text-color)]"
                  }`}
                  disabled={cell.value === "FREE"}
                  aria-pressed={marked}
                  onClick={() => handleToggle(cell)}
                >
                  {cell.value}
                </button>
              );
            })}
          </div>
        </GlassPanel>

        <GlassPanel className="rounded-[30px] p-5">
          <p className="m-0 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--muted-text)]">
            Ultimos numeros
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(room?.match.recentDraws ?? []).slice(0, 10).map((draw) => (
              <span
                key={draw.id}
                className="rounded-full bg-white/8 px-3 py-2 font-display text-sm font-bold text-[var(--text-color)]"
              >
                {draw.display}
              </span>
            ))}
            {room?.match.recentDraws.length ? null : (
              <span className="text-sm text-[var(--muted-text)]">
                Aguardando sorteio
              </span>
            )}
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}

function buildCellKey(cell: Pick<PrintableBingoCellDto, "row" | "col">) {
  return `${cell.row}:${cell.col}`;
}

function isCellMarked(
  cell: PrintableBingoCellDto,
  drawnSet: Set<string>,
  manualSet: Set<string>,
) {
  return (
    cell.value === "FREE" ||
    drawnSet.has(`${cell.letter}${cell.value}`) ||
    manualSet.has(buildCellKey(cell))
  );
}

function loadPrintedCardMarks(accessCode: string | undefined) {
  if (!accessCode) {
    return [];
  }

  try {
    const saved = window.localStorage.getItem(
      printedCardStorageKey(accessCode),
    );
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

function savePrintedCardMarks(accessCode: string | undefined, marks: string[]) {
  if (!accessCode) {
    return;
  }

  window.localStorage.setItem(
    printedCardStorageKey(accessCode),
    JSON.stringify(marks),
  );
}

function printedCardStorageKey(accessCode: string) {
  return `bfp:printed-card:${accessCode}:marks`;
}

function resolvePrintedCardError(reason: unknown) {
  if (reason instanceof ApiError && reason.isNetworkError) {
    return {
      title: "Sem conexao com o servidor",
      message: reason.message,
    };
  }

  if (reason instanceof ApiError && reason.status === 404) {
    return {
      title: "QR nao autenticado",
      message: reason.message || "Esta cartela nao foi emitida pelo painel.",
    };
  }

  return {
    title: "Falha ao abrir cartela",
    message:
      reason instanceof Error ? reason.message : "Cartela nao encontrada.",
  };
}

function countMissingForPattern(
  marks: boolean[][],
  pattern: PrizePattern,
  targetMarks?: number,
) {
  if (pattern === "marked_count") {
    const marked = marks.flat().filter(Boolean).length;
    return Math.max((targetMarks ?? 3) - marked, 0);
  }

  if (pattern === "full_house") {
    return marks.flat().filter((marked) => !marked).length;
  }

  const lineMisses = WIN_LINES.map((line) =>
    line.reduce((count, [row, col]) => count + (marks[row][col] ? 0 : 1), 0),
  );

  if (pattern === "single_line") {
    return Math.min(...lineMisses);
  }

  let best = Number.MAX_SAFE_INTEGER;

  for (let first = 0; first < WIN_LINES.length; first += 1) {
    for (let second = first + 1; second < WIN_LINES.length; second += 1) {
      const coords = new Set<string>();

      for (const [row, col] of WIN_LINES[first]) {
        coords.add(`${row}:${col}`);
      }

      for (const [row, col] of WIN_LINES[second]) {
        coords.add(`${row}:${col}`);
      }

      let missing = 0;
      for (const coord of coords) {
        const [row, col] = coord.split(":").map(Number);
        if (!marks[row][col]) {
          missing += 1;
        }
      }

      best = Math.min(best, missing);
    }
  }

  return best;
}

const WIN_LINES = [
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 2],
    [1, 3],
    [1, 4],
  ],
  [
    [2, 0],
    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
  ],
  [
    [3, 0],
    [3, 1],
    [3, 2],
    [3, 3],
    [3, 4],
  ],
  [
    [4, 0],
    [4, 1],
    [4, 2],
    [4, 3],
    [4, 4],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
  ],
  [
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
  ],
  [
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
    [4, 3],
  ],
  [
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ],
  [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
  ],
  [
    [0, 4],
    [1, 3],
    [2, 2],
    [3, 1],
    [4, 0],
  ],
] as const;
