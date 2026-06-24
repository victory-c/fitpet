// Eyestalks + eyes, 18x9, anchored so the eyes peek out just below the screen. One variant
// per emotional state, swappable (same dimensions + stalk rows). The stalks (O) are tintable
// crab flesh; the whites (W) are not.

const STALKS = ["...KK.......KK....", "...OO.......OO....", "...OO.......OO....", "...OO.......OO...."];

export const EYES_NEUTRAL = {
  anchor: [23, 22] as [number, number],
  grid: ["..KKKK.....KKKK...", ".KWWWWK...KWWWWK..", ".KWKKWK...KWKKWK..", ".KWWWWK...KWWWWK..", "..KKKK.....KKKK...", ...STALKS],
};

export const EYES_HAPPY = {
  anchor: [23, 22] as [number, number],
  grid: ["..KKKK.....KKKK...", ".KWKKWK...KWKKWK..", ".KWWWWK...KWWWWK..", ".KWWWWK...KWWWWK..", "..KKKK.....KKKK...", ...STALKS],
};

export const EYES_TIRED = {
  anchor: [23, 22] as [number, number],
  grid: ["..KKKK.....KKKK...", ".KKKKKK...KKKKKK..", ".KWWWWK...KWWWWK..", ".KWKKWK...KWKKWK..", "..KKKK.....KKKK...", ...STALKS],
};

export const EYES_CLOSED = {
  anchor: [23, 22] as [number, number],
  grid: ["..................", "..KKKK.....KKKK...", ".KKKKKK...KKKKKK..", "..................", "..................", ...STALKS],
};
