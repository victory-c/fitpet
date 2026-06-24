// Renderer = pure VIEW. A requestAnimationFrame loop composites Shelldon back-to-front from
// modular parts, scaled per growth stage, tinted/postured by vitality, with a procedural CRT
// screen and procedural sport limbs. The pure view-model picks every key; this file only draws.
// The loop never throws, and an absent bridge/snapshot falls back to a safe healthy-adult
// composition — so the window is never blank.

import { BODY, SHELL, EYES, CLAWS, CLAW_ANCHORS, PALETTE, TINTABLE } from "./sprites/shelldon/index.ts";
import { drawPart, mixToGrey } from "./draw.ts";
import { drawScreen } from "./screen.ts";
import {
  partsFor,
  safeComposition,
  screenMode,
  vitalsParams,
  stageScale,
  sportKindFor,
  type Parts,
  type VmSnap,
} from "./view-model.ts";

interface Reaction {
  text: string;
  event: string;
  setAtMs: number;
}
interface Snap {
  species: string;
  name: string;
  tier: "thriving" | "healthy" | "wilting" | "dormant";
  stage: string;
  vitality: number;
  rollingScore: number;
  lastSport: string | null;
  lastActivityAt: string | null;
  healthyDays: number;
  reaction: Reaction | null;
}
interface FitpetApi {
  getState: () => Promise<Snap>;
  onState: (cb: (snap: Snap) => void) => () => void;
}

const SCALE = 4; // 64 logical px * 4 = 256px

const canvas = document.getElementById("pet") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
const label = document.getElementById("label") as HTMLElement;
const bubble = document.getElementById("bubble") as HTMLElement;
const bubbleText = document.getElementById("bubble-text") as HTMLElement;

const ORANGE_SHADOW = "#cc5f27";

let current: Snap | null = null;
let celebrateUntil = 0; // a brief one-shot beat for evolved/revived
let celebrateKind = "";
let lastReactionKey = "";

function toVm(s: Snap): VmSnap {
  return {
    stage: s.stage,
    tier: s.tier,
    vitality: s.vitality,
    lastSport: s.lastSport,
    lastActivityAt: s.lastActivityAt,
    reaction: s.reaction ? { event: s.reaction.event, setAtMs: s.reaction.setAtMs } : null,
  };
}

function drawShadow(): void {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(32 * SCALE, 54 * SCALE, 17 * SCALE, 3.5 * SCALE, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const LEGS: [number, number][] = [
  [13, 49],
  [17, 51],
  [22, 52],
  [42, 52],
  [47, 51],
  [51, 49],
];
const HIPS: [number, number][] = [
  [21, 39],
  [24, 41],
  [27, 42],
  [37, 42],
  [40, 41],
  [43, 39],
];

function legColor(tint: number): string {
  return tint > 0 ? mixToGrey(ORANGE_SHADOW, tint) : ORANGE_SHADOW;
}

function drawLegs(tint: number, sport: string, tMs: number): void {
  ctx.save();
  ctx.strokeStyle = legColor(tint);
  ctx.lineWidth = Math.max(1, SCALE * 0.8);
  ctx.lineCap = "round";
  for (let i = 0; i < LEGS.length; i++) {
    const hip = HIPS[i]!;
    const foot = LEGS[i]!;
    let fx = foot[0];
    let fy = foot[1];
    if (sport === "run") {
      // alternate stride
      const dir = i % 2 === 0 ? 1 : -1;
      fx += Math.sin(tMs / 90 + i) * dir * 3;
    } else if (sport === "cycle") {
      // feet circle around a pedal hub
      const a = tMs / 150 + (i % 2) * Math.PI;
      fx = 32 + Math.cos(a) * 6 + (i < 3 ? -2 : 2);
      fy = 50 + Math.sin(a) * 4;
    }
    ctx.beginPath();
    ctx.moveTo(hip[0] * SCALE, hip[1] * SCALE);
    ctx.lineTo(fx * SCALE, fy * SCALE);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBike(tMs: number): void {
  ctx.save();
  ctx.strokeStyle = "#3a3a44";
  ctx.lineWidth = Math.max(1, SCALE * 0.6);
  const y = 52 * SCALE;
  for (const cx of [22, 42]) {
    ctx.beginPath();
    ctx.arc(cx * SCALE, y, 5 * SCALE, 0, Math.PI * 2);
    ctx.stroke();
    const a = (tMs / 120) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(cx * SCALE, y);
    ctx.lineTo((cx + Math.cos(a) * 5) * SCALE, y + Math.sin(a) * 5 * SCALE);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(22 * SCALE, y);
  ctx.lineTo(32 * SCALE, 46 * SCALE);
  ctx.lineTo(42 * SCALE, y);
  ctx.stroke();
  ctx.restore();
}

function drawBubbles(tMs: number): void {
  ctx.save();
  ctx.strokeStyle = "rgba(120,200,230,0.7)";
  ctx.lineWidth = Math.max(1, SCALE * 0.3);
  for (let i = 0; i < 4; i++) {
    const x = 18 + i * 9 + ((i % 2) ? 2 : 0);
    const y = 48 - ((tMs / 12 + i * 25) % 26);
    ctx.beginPath();
    ctx.arc(x * SCALE, y * SCALE, (1 + (i % 2)) * SCALE * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCelebration(tMs: number): void {
  const left = celebrateUntil - tMs;
  if (left <= 0) return;
  const prog = 1 - left / 900;
  ctx.save();
  ctx.strokeStyle = celebrateKind === "revived" ? "#54f07a" : "#ffd166";
  ctx.lineWidth = Math.max(1, SCALE * 0.6);
  const cx = 32 * SCALE;
  const cy = 30 * SCALE;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = prog * 22 * SCALE;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.restore();
}

function composeEgg(p: Parts, vitality: number, tMs: number): void {
  const shell = SHELL.boot!;
  drawPart(ctx, shell.grid, PALETTE, shell.anchor[0], shell.anchor[1], { scale: SCALE });
  drawScreen(ctx, shell.screen, SCALE, "boot", vitality, vitalsParams(vitality), "none", tMs);
  void p;
}

function composeCrab(snap: Snap, p: Parts, mode: ReturnType<typeof screenMode>, tMs: number): void {
  const vitality = snap.vitality;
  const tint = p.tintFactor;
  const post = p.posture;

  drawShadow();
  if (p.sport === "cycle") drawBike(tMs);
  drawLegs(tint, p.sport, tMs);

  const body = BODY[p.stage] ?? BODY.adult!;
  drawPart(ctx, body.grid, PALETTE, body.anchor[0], body.anchor[1] + post.bodyDy, { scale: SCALE, tint, tintable: TINTABLE });

  const claw = CLAWS[p.claws] ?? CLAWS.rest!;
  drawPart(ctx, claw.grid, PALETTE, CLAW_ANCHORS.left[0], CLAW_ANCHORS.left[1] + post.clawDy, { scale: SCALE, tint, tintable: TINTABLE });
  drawPart(ctx, claw.grid, PALETTE, CLAW_ANCHORS.right[0], CLAW_ANCHORS.right[1] + post.clawDy, {
    scale: SCALE,
    tint,
    tintable: TINTABLE,
    mirror: true,
  });

  const shell = SHELL[p.shellTier] ?? SHELL.flat!;
  drawPart(ctx, shell.grid, PALETTE, shell.anchor[0], shell.anchor[1], { scale: SCALE });
  drawScreen(ctx, shell.screen, SCALE, mode, vitality, vitalsParams(vitality), sportKindFor(snap.lastSport), tMs);

  const eyes = EYES[p.eyes] ?? EYES.neutral!;
  drawPart(ctx, eyes.grid, PALETTE, eyes.anchor[0], eyes.anchor[1] + post.eyeDy, { scale: SCALE, tint, tintable: TINTABLE });

  if (p.sport === "swim") drawBubbles(tMs);
}

function compose(snap: Snap | null, tMs: number): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let p: Parts;
  let mode: ReturnType<typeof screenMode>;
  let s: Snap;
  try {
    if (snap) {
      p = partsFor(toVm(snap), Date.now());
      mode = screenMode(toVm(snap), Date.now());
      s = snap;
    } else {
      throw new Error("no snapshot");
    }
  } catch {
    p = safeComposition();
    mode = "vitals";
    s = { species: "", name: "", tier: "healthy", stage: "adult", vitality: 60, rollingScore: 60, lastSport: null, lastActivityAt: null, healthyDays: 0, reaction: null };
  }

  const sc = stageScale(p.stage);
  const breatheDy = Math.round(Math.sin(tMs / 900));
  const cx = 32 * SCALE;
  const cy = 44 * SCALE;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);
  ctx.translate(-cx, -cy);
  ctx.translate(0, breatheDy * SCALE);

  if (p.stage === "egg") composeEgg(p, s.vitality, tMs);
  else composeCrab(s, p, mode, tMs);

  drawCelebration(tMs);
  ctx.restore();
}

function onSnap(s: Snap): void {
  current = s;
  label.textContent = `${s.name} · ${s.vitality}%`;
  if (s.reaction) {
    bubbleText.textContent = s.reaction.text;
    bubble.classList.add("show");
    const key = `${s.reaction.event}:${s.reaction.setAtMs}`;
    if (key !== lastReactionKey) {
      lastReactionKey = key;
      if (s.reaction.event === "evolved" || s.reaction.event === "revived") {
        celebrateKind = s.reaction.event;
        celebrateUntil = performance.now() + 900;
      }
    }
  } else {
    bubble.classList.remove("show");
    lastReactionKey = "";
  }
}

// Cap to ~30 FPS (plenty for a breathing companion) and stop drawing entirely while the
// window is hidden/minimised, so an always-on-top window isn't burning CPU at 60 FPS forever.
const FRAME_MS = 1000 / 30;
let lastDraw = 0;
let paused = false;

document.addEventListener("visibilitychange", () => {
  paused = document.hidden;
  lastDraw = 0; // redraw promptly when shown again
});

function loop(tMs: number): void {
  if (!paused && tMs - lastDraw >= FRAME_MS) {
    lastDraw = tMs;
    try {
      compose(current, tMs);
    } catch {
      /* never blank: skip this frame rather than throw out of rAF */
    }
  }
  requestAnimationFrame(loop);
}

async function init(): Promise<void> {
  const api = (window as unknown as { fitpet?: FitpetApi }).fitpet;
  if (api) {
    try {
      onSnap(await api.getState());
    } catch {
      /* the loop will draw safeComposition until state arrives */
    }
    api.onState((snap) => onSnap(snap));
  } else {
    label.textContent = "FitPet";
  }
  requestAnimationFrame(loop);
}

void init();
