// Crab body (carapace + underbelly), authored as a 40x12 text grid placed at an anchor on
// the 64x64 composition. Legs and ground shadow are drawn procedurally by the renderer (they
// are thin angled strokes that read poorly as a pixel grid). One file per stage in Phase 3;
// Phase 1 ships the adult.

export const BODY_ADULT = {
  anchor: [12, 28] as [number, number],
  grid: [
    "..............KKKKKKKKKKKK..............",
    "............KKHHOOOOOOOOOOKK............",
    "..........KKHHOOOOOOOOOOOOooKK..........",
    ".........KHHOOOOOOOOOOOOOOOOooK.........",
    ".........KHOOOOOOOOOOOOOOOOOOoK.........",
    ".........KOOOOOOOOOOOOOOOOOOOOK.........",
    ".........KOOOOOOOOOOOOOOOOOOooK.........",
    ".........KOOOOOOOOOOOOOOOOOOooK.........",
    "..........KKOOOOOOOOOOOOOOOOKK..........",
    "............KooooooooooooK..............",
    "............KooooooooooooK..............",
    "............KKKKKKKKKKKKKKKK............",
  ],
};
