// The shell = a CRT/monitor, one per hardware tier (derived from stage). `screen` is the
// GLOBAL logical rect (on the 64x64 canvas) where the procedural screen is drawn; the 'S'
// cells are just a base fill. Growth also scales the whole composition (see view-model
// stageScale), so these differ mainly in HARDWARE design, not absolute size.

const NECK = "..............KCCCCK..............";
const BASE = "............KKCCCCCCCCKK..........";

// Adult — sleek flat panel, thin bezel, big screen.
export const SHELL_FLAT = {
  anchor: [15, 4] as [number, number],
  screen: { x: 20, y: 8, w: 24, h: 14 },
  grid: [
    ".KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.",
    "KCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCK",
    "KCC" + "B".repeat(28) + "CCK",
    "KCC" + "B".repeat(28) + "CCK",
    ...Array(14).fill("KCCBB" + "S".repeat(24) + "BBCCK"),
    "KCC" + "B".repeat(28) + "CCK",
    "KCC" + "B".repeat(28) + "CCK",
    "KCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCK",
    ".KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.",
    NECK,
    BASE,
  ],
};

// Juvenile — a colour monitor, medium bezel.
export const SHELL_COLOR = {
  anchor: [15, 4] as [number, number],
  screen: { x: 21, y: 8, w: 22, h: 12 },
  grid: [
    ".KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.",
    "KCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCK",
    "KCCC" + "B".repeat(26) + "CCCK",
    "KCCC" + "B".repeat(26) + "CCCK",
    ...Array(12).fill("KCCCBB" + "S".repeat(22) + "BBCCCK"),
    "KCCC" + "B".repeat(26) + "CCCK",
    "KCCC" + "B".repeat(26) + "CCCK",
    "KCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCK",
    ".KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.",
    NECK,
    BASE,
  ],
};

// Hatchling — a chunky monochrome CRT, thick cream casing, small screen.
export const SHELL_MONO = {
  anchor: [15, 4] as [number, number],
  screen: { x: 22, y: 8, w: 20, h: 10 },
  grid: [
    ".KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.",
    "KCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCK",
    "KCCCC" + "B".repeat(24) + "CCCCK",
    "KCCCC" + "B".repeat(24) + "CCCCK",
    ...Array(10).fill("KCCCCBB" + "S".repeat(20) + "BBCCCCK"),
    "KCCCC" + "B".repeat(24) + "CCCCK",
    "KCCCC" + "B".repeat(24) + "CCCCK",
    "KCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCK",
    ".KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.",
    NECK,
    BASE,
  ],
};

// Egg — a speckled shell with a small dark window where a CRT "boots" inside (no crab yet).
export const SHELL_BOOT = {
  anchor: [22, 16] as [number, number],
  screen: { x: 29, y: 24, w: 6, h: 6 },
  grid: [
    ".......KKKKKK.......",
    ".....KKCCCCCCKK.....",
    "....KCCCCCCCCCCK....",
    "...KCCCCcCCCCCCCK...",
    "..KCCCCCCCCCCCCCCK..",
    "..KCCCCCCCCCCCCCCK..",
    ".KCCCCCcCCCCCCCCCCK.",
    ".KCCCCCCCCCCCcCCCK..",
    ".KCCCCCSSSSSSCCCCCK.",
    ".KCCCCCSSSSSSCCCCCK.",
    ".KCCCCCSSSSSSCCCCCK.",
    ".KCCCCCSSSSSSCCCCCK.",
    ".KCCCCCSSSSSSCCCCCK.",
    ".KCCCCCSSSSSSCCCCCK.",
    ".KCCCCCCCCCCCCCCCCK.",
    ".KCCCCcCCCCCCCCCCCK.",
    "..KCCCCCCCCCCCCCCK..",
    "..KCCCCCCCCCCCCCCK..",
    "...KCCCCCCCCCCCCK...",
    "...KCCCCcCCCCCCK....",
    "....KCCCCCCCCCCK....",
    ".....KKCCCCCCKK.....",
    ".......KKKKKK.......",
  ],
};
