export function applyThemeColor(hex: string | null): void {
  if (!hex) return;
  document.documentElement.style.setProperty('--theme-color', hex);
  const luminance = computeLuminance(hex);
  const textColor = luminance > 0.4 ? '#1a1a1a' : '#f0f0f0';
  document.documentElement.style.setProperty('--theme-text-color', textColor);
}

function computeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
