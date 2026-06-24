// Keyed lookups the renderer uses to turn the view-model's descriptor keys into actual art.
// Body is a single grid scaled per stage (see view-model stageScale); the shell hardware and
// eye state vary by key. Egg is special — the renderer draws only SHELL.boot for it.

import { PALETTE, TINTABLE } from "./palette.ts";
import { BODY_ADULT } from "./body.ts";
import { SHELL_FLAT, SHELL_COLOR, SHELL_MONO, SHELL_BOOT } from "./shell.ts";
import { EYES_NEUTRAL, EYES_HAPPY, EYES_TIRED, EYES_CLOSED } from "./eyes.ts";
import { CLAW_REST } from "./claws.ts";

export { PALETTE, TINTABLE };

export interface Part {
  grid: string[];
  anchor: [number, number];
}
export interface ShellPart extends Part {
  screen: { x: number; y: number; w: number; h: number };
}

// One body grid; growth size is a per-stage scale in the renderer, not separate art.
export const BODY: Record<string, Part> = {
  adult: BODY_ADULT,
  juvenile: BODY_ADULT,
  hatchling: BODY_ADULT,
};

export const SHELL: Record<string, ShellPart> = {
  flat: SHELL_FLAT,
  color: SHELL_COLOR,
  mono: SHELL_MONO,
  boot: SHELL_BOOT,
};

export const EYES: Record<string, Part> = {
  neutral: EYES_NEUTRAL,
  happy: EYES_HAPPY,
  tired: EYES_TIRED,
  closed: EYES_CLOSED,
};

// One claw grid; "raised"/"sport" are conveyed by posture offsets + procedural limbs.
export const CLAWS: Record<string, { grid: string[] }> = {
  rest: CLAW_REST,
  raised: CLAW_REST,
  sport: CLAW_REST,
};

export const CLAW_ANCHORS = {
  left: [16, 33] as [number, number],
  right: [40, 33] as [number, number],
};

export const CANVAS_LOGICAL = 64;
