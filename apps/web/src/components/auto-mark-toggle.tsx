import { ToggleChip } from '@bingo/ui';

interface AutoMarkToggleProps {
  autoMark: boolean;
  onChange: (value: boolean) => void;
}

export function AutoMarkToggle({ autoMark, onChange }: AutoMarkToggleProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <ToggleChip active={autoMark} onClick={() => onChange(true)}>
        Auto marcar
      </ToggleChip>
      <ToggleChip active={!autoMark} onClick={() => onChange(false)}>
        Manual
      </ToggleChip>
    </div>
  );
}
