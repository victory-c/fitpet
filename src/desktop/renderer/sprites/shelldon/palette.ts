// Shelldon's shared palette: char -> hex. TINTABLE marks the crab-flesh chars that the
// renderer desaturates toward grey as vitality drops; the cream casing, screen, and dark
// outline are NOT tinted (the CRT doesn't get sick — its screen goes to standby instead).

export const PALETTE: Record<string, string> = {
  K: "#241a14", // dark outline (also eye pupil)
  O: "#ef7d3a", // crab orange
  o: "#cc5f27", // crab orange shadow
  H: "#f6a366", // crab highlight
  C: "#ece3d0", // casing cream
  c: "#c9bda0", // casing shadow
  B: "#32323c", // screen bezel
  S: "#0a160d", // screen interior base (procedural overdraw)
  W: "#f4f1e8", // eye white
};

export const TINTABLE = new Set(["O", "o", "H"]);
