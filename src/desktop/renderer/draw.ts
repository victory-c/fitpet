// Canvas drawing helpers. `mixToGrey` is pure (and unit-tested); `drawPart` blits a text-grid
// layer, optionally tinting the crab-flesh cells toward grey by a vitality-derived factor and
// optionally mirroring (for the right-hand claw).

export type Palette = Record<string, string>;

const GREY_TARGET = 150;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// Lerp a #rrggbb color toward mid-grey by factor f in [0,1]. f=0 keeps the color, f=1 -> grey.
export function mixToGrey(hex: string, f: number): string {
  const t = clamp01(f);
  const c = hex.replace("#", "");
  const ch = (i: number): number => {
    const v = parseInt(c.slice(i, i + 2), 16);
    const mixed = Math.round(v + (GREY_TARGET - v) * t);
    return mixed;
  };
  const hx = (v: number): string => v.toString(16).padStart(2, "0");
  return `#${hx(ch(0))}${hx(ch(2))}${hx(ch(4))}`;
}

export interface DrawOpts {
  scale: number;
  tint?: number; // 0 = full color, 1 = full grey (only applied to `tintable` chars)
  tintable?: Set<string>;
  mirror?: boolean;
}

export function drawPart(
  ctx: CanvasRenderingContext2D,
  grid: string[],
  palette: Palette,
  ax: number,
  ay: number,
  opts: DrawOpts,
): void {
  const { scale, tint = 0, tintable, mirror = false } = opts;
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y] ?? "";
    for (let x = 0; x < row.length; x++) {
      const ch = row[mirror ? row.length - 1 - x : x] as string;
      let color = palette[ch];
      if (!color) continue; // transparent
      if (tint > 0 && tintable && tintable.has(ch)) color = mixToGrey(color, tint);
      ctx.fillStyle = color;
      ctx.fillRect((ax + x) * scale, (ay + y) * scale, scale, scale);
    }
  }
}
