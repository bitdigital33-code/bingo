export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-16 w-16 rounded-full border border-white/10 border-t-[var(--accent)] animate-spin" />
        <p className="text-sm uppercase tracking-[0.28em] text-[var(--muted-text)]">{label}</p>
      </div>
    </div>
  );
}
