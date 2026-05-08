import { ToggleChip } from '@bingo/ui';

interface HighContrastToggleProps {
  active: boolean;
  onToggle: () => void;
}

export function HighContrastToggle({ active, onToggle }: HighContrastToggleProps) {
  return (
    <ToggleChip active={active} onClick={onToggle}>
      Alto contraste
    </ToggleChip>
  );
}
