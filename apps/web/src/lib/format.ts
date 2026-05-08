export function formatDisplay(display?: string) {
  if (!display) {
    return '--';
  }

  return display.replace(/([A-Z])(\d+)/, '$1 $2');
}
