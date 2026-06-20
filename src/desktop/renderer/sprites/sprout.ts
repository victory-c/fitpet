// Original pixel art for the Sprout species, authored as text grids (NOT copied from any
// existing pet). Each row is 16 characters; '.' is transparent and every other character
// maps to a PALETTE colour. Drawn at 8x in the renderer. To tweak the art, edit a character.

export type TierName = "thriving" | "healthy" | "wilting" | "dormant";

export const PALETTE: Record<string, string> = {
  G: "#6cc24a", // bright leaf
  g: "#4a9e34", // leaf shade
  s: "#5a8a3a", // stem
  L: "#9be36a", // leaf highlight
  E: "#22311f", // open eye
  m: "#22311f", // mouth / closed eye
  P: "#cf7a4a", // pot
  p: "#a85e34", // pot shade
  F: "#ff9ec7", // flower petal
  o: "#ffd166", // flower centre
  Y: "#c2bb4a", // wilting leaf
  y: "#8f8a2f", // wilting shade
  B: "#9a8a6a", // dormant brown
  b: "#6f5f44", // dormant shade
  z: "#aab8c2", // sleep "z"
  W: "#f2e6c2", // egg shell
  c: "#d8c187", // egg speckle
};

// 16x16, top row first.
export const SPROUT: Record<TierName, string[]> = {
  thriving: [
    "......FoF.......",
    ".......s........",
    ".....gGGGGg.....",
    "...LgGGGGGGgL...",
    "..LgGGGGGGGGgL..",
    "..LGGGGGGGGGGL..",
    "...GGGGGGGGGG...",
    "...GGEGGGGEGG...",
    "...GGGGGGGGGG...",
    "....GGmmmmGG....",
    ".....gGGGGg.....",
    ".......s........",
    ".......s........",
    "....PPPPPPPP....",
    "....PppppppP....",
    ".....PPPPPP.....",
  ],
  healthy: [
    "......L.L.......",
    ".......s........",
    ".....gGGGGg.....",
    "....gGGGGGGg....",
    "...gGGGGGGGGg...",
    "..LGGGGGGGGGGL..",
    "...GGGGGGGGGG...",
    "...GGEGGGGEGG...",
    "...GGGGGGGGGG...",
    "....GGGmmGGG....",
    ".....gGGGGg.....",
    ".......s........",
    ".......s........",
    "....PPPPPPPP....",
    "....PppppppP....",
    ".....PPPPPP.....",
  ],
  wilting: [
    "......y.y.......",
    ".......s........",
    ".....yYYYYy.....",
    "....yYYYYYYy....",
    "...yYYYYYYYYy...",
    "...YYYYYYYYYY...",
    "..LYYYYYYYYYYL..",
    "...YYEYYYYEYY...",
    "...YYYYYYYYYY...",
    "....YYYmmYYY....",
    ".....yYYYYy.....",
    ".......s........",
    ".......s........",
    "....PPPPPPPP....",
    "....PppppppP....",
    ".....PPPPPP.....",
  ],
  dormant: [
    "...........z....",
    "..........z.....",
    ".....bBBBBb.....",
    "....bBBBBBBb....",
    "...bBBBBBBBBb...",
    "...BBBBBBBBBB...",
    "...BBBBBBBBBB...",
    "...BBmBBBBmBB...",
    "...BBBBBBBBBB...",
    "....BBBBBBBB....",
    ".....bBBBBb.....",
    ".......s........",
    ".......s........",
    "....PPPPPPPP....",
    "....PppppppP....",
    ".....PPPPPP.....",
  ],
};

// Shown while the pet is still an egg (stage === "egg"), regardless of tier — so feeding a
// fresh pet visibly hatches it from this egg into the sprout above.
export const EGG: string[] = [
  "................",
  "......WWWW......",
  ".....WWWWWW.....",
  "....WWWWWWWW....",
  "...WWWWWWWWWW...",
  "...WWcWWWWWWW...",
  "..WWWWWWWWWWWW..",
  "..WWWWWWWWcWWW..",
  "..WWWWWWWWWWWW..",
  "...WWWWWWWWWW...",
  "...WWWWWWWWWW...",
  "....WWWWWWWW....",
  ".....WWWWWW.....",
  "....PPPPPPPP....",
  "....PppppppP....",
  ".....PPPPPP.....",
];
