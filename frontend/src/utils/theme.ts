export function applyThemeColor(hex: string | null): void {
  if (!hex) return;
  document.documentElement.style.setProperty('--theme-color', hex);
  const luminance = computeLuminance(hex);
  const textColor = luminance > 0.4 ? '#1a1a1a' : '#f0f0f0';
  document.documentElement.style.setProperty('--theme-text-color', textColor);

  // day-page 背景（テーマカラー25% + #1a1a1a 75%）向けのコントラスト色
  const mixedLuminance = computeLuminance(mixHex(hex, '#1a1a1a', 0.25));
  const mutedTextColor = mixedLuminance > 0.4 ? '#555555' : '#999999';
  document.documentElement.style.setProperty('--theme-empty-text-color', mutedTextColor);
}

function mixHex(hexA: string, hexB: string, ratioA: number): string {
  const mixChannel = (a: number, b: number) => Math.round(a * ratioA + b * (1 - ratioA));
  const toRgb = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = toRgb(hexA);
  const [br, bg, bb] = toRgb(hexB);
  const toHex2 = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex2(mixChannel(ar, br))}${toHex2(mixChannel(ag, bg))}${toHex2(mixChannel(ab, bb))}`;
}

function computeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
