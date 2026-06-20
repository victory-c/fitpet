// Renderer = pure VIEW. Draws the sprite for the current state, runs a CONTINUOUS idle
// animation keyed to the last sport, shows a speech bubble while a reaction is live, and
// plays a short per-event animation when a new reaction arrives. State changes only swap
// which sprite/idle is shown; the idle loop itself runs continuously (CSS, GPU-driven).

import { SPROUT, PALETTE, type TierName } from "./sprites/sprout";
import { IDLE_CLASSES, idleClassForSnap, reactionAnimationClass, spriteFor } from "./view-model.ts";

interface Reaction {
  text: string;
  event: string;
  setAtMs: number;
}
interface Snap {
  species: string;
  name: string;
  tier: TierName;
  stage: string;
  vitality: number;
  rollingScore: number;
  lastSport: string | null;
  reaction: Reaction | null;
}
interface FitpetApi {
  getState: () => Promise<Snap>;
  onState: (cb: (snap: Snap) => void) => () => void;
}

const SCALE = 8;
const canvas = document.getElementById("pet") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
const petWrap = document.getElementById("pet-wrap") as HTMLElement;
const label = document.getElementById("label") as HTMLElement;
const bubble = document.getElementById("bubble") as HTMLElement;
const bubbleText = document.getElementById("bubble-text") as HTMLElement;

function drawGrid(grid: string[]): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const color = PALETTE[row[x] as string];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  }
}

// Swap the idle animation only when it actually changes, so the loop never restarts/jitters.
function setIdle(want: string): void {
  if (canvas.classList.contains(want)) return;
  canvas.classList.remove(...IDLE_CLASSES);
  canvas.classList.add(want);
}

function playReactionAnim(event: string): void {
  const cls = reactionAnimationClass(event);
  petWrap.classList.remove("shake", "bounce", "pop");
  void petWrap.offsetWidth; // force reflow so the animation restarts
  petWrap.classList.add(cls);
}

let lastReactionKey = "";

function render(s: Snap): void {
  drawGrid(spriteFor(s));
  // A dormant (sleeping) pet just breathes; otherwise it idles to its last sport.
  setIdle(idleClassForSnap(s));
  label.textContent = `${s.name} · ${s.stage} · ${s.tier} · ${s.vitality}`;

  if (s.reaction) {
    bubbleText.textContent = s.reaction.text;
    bubble.classList.add("show");
    const key = `${s.reaction.event}:${s.reaction.setAtMs}`;
    if (key !== lastReactionKey) {
      playReactionAnim(s.reaction.event);
      lastReactionKey = key;
    }
  } else {
    bubble.classList.remove("show");
    lastReactionKey = "";
  }
}

async function init(): Promise<void> {
  const api = (window as unknown as { fitpet?: FitpetApi }).fitpet;
  if (!api) {
    drawGrid(SPROUT.healthy);
    setIdle("idle-default");
    label.textContent = "FitPet";
    return;
  }
  try {
    render(await api.getState());
  } catch {
    drawGrid(SPROUT.healthy);
    setIdle("idle-default");
  }
  api.onState((s) => render(s));
}

void init();
