// The procedural CRT screen. One entry point, drawScreen(), dispatches by mode (chosen by the
// pure view-model). Everything here is canvas drawing keyed to vitality + animation time.

export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type ScreenModeName = "flash-pos" | "flash-neg" | "flash-neutral" | "boot" | "standby" | "sport" | "vitals";
export interface Params {
  rate: number;
  amp: number;
  color: string;
}

const BG = "#06140b";

function ecg(f: number): number {
  if (f > 0.46 && f < 0.5) return -((f - 0.46) / 0.04);
  if (f >= 0.5 && f < 0.54) return -(1 - (f - 0.5) / 0.04);
  if (f >= 0.54 && f < 0.58) return 0.4 * ((f - 0.54) / 0.04);
  if (f >= 0.58 && f < 0.62) return 0.4 * (1 - (f - 0.58) / 0.04);
  return 0;
}

function drawVitals(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number,
  scale: number,
  vitality: number,
  p: Params,
  tMs: number,
): void {
  const midY = y0 + h * 0.4;
  const amp = h * p.amp;
  const period = w / 2;
  const phase = (tMs * 0.05 * scale * p.rate) % period;
  ctx.strokeStyle = p.color;
  ctx.lineWidth = Math.max(1, scale * 0.5);
  ctx.beginPath();
  for (let px = 0; px <= w; px++) {
    const f = ((px + phase) % period) / period;
    const y = midY + ecg(f) * amp;
    if (px === 0) ctx.moveTo(x0 + px, y);
    else ctx.lineTo(x0 + px, y);
  }
  ctx.stroke();

  const bw = w * 0.62;
  const bh = Math.max(2 * scale, h * 0.16);
  const bx = x0 + (w - bw) / 2;
  const by = y0 + h - bh - scale;
  ctx.lineWidth = Math.max(1, scale * 0.4);
  ctx.strokeStyle = p.color;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = p.color;
  ctx.fillRect(bx + scale * 0.5, by + scale * 0.5, (bw - scale) * Math.max(0, Math.min(1, vitality / 100)), bh - scale);

  if (tMs % 1000 < 500) {
    ctx.fillStyle = p.color;
    ctx.fillRect(x0 + scale, y0 + scale, scale * 1.5, scale);
  }
}

function drawStandby(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, scale: number, tMs: number): void {
  ctx.strokeStyle = "#244031";
  ctx.lineWidth = Math.max(1, scale * 0.5);
  ctx.beginPath();
  ctx.moveTo(x0 + scale, y0 + h / 2);
  ctx.lineTo(x0 + w - scale, y0 + h / 2);
  ctx.stroke();
  if (tMs % 1600 < 800) {
    ctx.fillStyle = "#e0b341";
    ctx.beginPath();
    ctx.arc(x0 + w - scale * 2.5, y0 + scale * 2.5, scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBoot(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, scale: number, tMs: number): void {
  // flickering green blocks like a CRT warming up inside the egg
  const rng = (n: number) => Math.abs(Math.sin(n * 12.9898 + Math.floor(tMs / 180) * 78.233) * 43758.5453) % 1;
  ctx.fillStyle = "#2f8f4a";
  const rows = Math.max(2, Math.floor(h / scale / 1.5));
  for (let r = 0; r < rows; r++) {
    if (rng(r) > 0.5) ctx.fillRect(x0 + scale, y0 + r * scale * 1.5 + scale * 0.5, w * (0.3 + rng(r + 9) * 0.5), scale);
  }
}

function drawSport(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number,
  scale: number,
  sport: string,
  tMs: number,
): void {
  ctx.strokeStyle = "#54f07a";
  ctx.fillStyle = "#54f07a";
  ctx.lineWidth = Math.max(1, scale * 0.5);
  const cy = y0 + h / 2;
  if (sport === "swim") {
    ctx.beginPath();
    for (let px = 0; px <= w; px++) {
      const y = cy + Math.sin((px + tMs * 0.05 * scale) / (w / 12)) * h * 0.18;
      px === 0 ? ctx.moveTo(x0 + px, y) : ctx.lineTo(x0 + px, y);
    }
    ctx.stroke();
  } else if (sport === "cycle") {
    const a = (tMs / 200) % (Math.PI * 2);
    const r = h * 0.3;
    const cx = x0 + w / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  } else {
    const bob = Math.abs(Math.sin(tMs / 180)) * h * 0.3;
    ctx.beginPath();
    ctx.arc(x0 + ((tMs / 8) % w), cy - bob + h * 0.15, scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFlash(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, scale: number, color: string, glyph: string, tMs: number): void {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(x0, y0, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = BG;
  ctx.lineWidth = Math.max(2, scale * 0.8);
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  const s = Math.min(w, h) * 0.25;
  ctx.beginPath();
  if (glyph === "check") {
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx - s * 0.3, cy + s);
    ctx.lineTo(cx + s, cy - s);
  } else if (glyph === "cross") {
    ctx.moveTo(cx - s, cy - s);
    ctx.lineTo(cx + s, cy + s);
    ctx.moveTo(cx + s, cy - s);
    ctx.lineTo(cx - s, cy + s);
  } else {
    ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
  }
  ctx.stroke();
}

export function drawScreen(
  ctx: CanvasRenderingContext2D,
  rect: ScreenRect,
  scale: number,
  mode: ScreenModeName,
  vitality: number,
  params: Params,
  sport: string,
  tMs: number,
): void {
  const x0 = rect.x * scale;
  const y0 = rect.y * scale;
  const w = rect.w * scale;
  const h = rect.h * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.fillStyle = BG;
  ctx.fillRect(x0, y0, w, h);
  switch (mode) {
    case "flash-pos":
      drawFlash(ctx, x0, y0, w, h, scale, "#54f07a", "check", tMs);
      break;
    case "flash-neg":
      drawFlash(ctx, x0, y0, w, h, scale, "#f0544c", "cross", tMs);
      break;
    case "flash-neutral":
      drawFlash(ctx, x0, y0, w, h, scale, "#e0b341", "dot", tMs);
      break;
    case "boot":
      drawBoot(ctx, x0, y0, w, h, scale, tMs);
      break;
    case "standby":
      drawStandby(ctx, x0, y0, w, h, scale, tMs);
      break;
    case "sport":
      drawSport(ctx, x0, y0, w, h, scale, sport, tMs);
      break;
    default:
      drawVitals(ctx, x0, y0, w, h, scale, vitality, params, tMs);
  }
  ctx.restore();
}
