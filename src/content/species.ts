// Species = the "look": a name, emoji, and a face per tier. Faces have an ASCII fallback
// for terminals that render the emoji/unicode ones poorly (used in Phase 2).

import type { Tier } from "../types.ts";

export interface Species {
  id: string;
  name: string;
  emoji: string;
  defaultPersonality: string;
  faces: Record<Tier, string>;
  asciiFaces: Record<Tier, string>;
}

export const DEFAULT_SPECIES = "sprout";

export const SPECIES: Record<string, Species> = {
  sprout: {
    id: "sprout",
    name: "Sprout",
    emoji: "🌱",
    defaultPersonality: "earnest",
    faces: { thriving: "(•ᴗ•)🌿", healthy: "(•ᴗ•)", wilting: "(._.)", dormant: "(-_-)zzz" },
    asciiFaces: { thriving: "(^_^)v", healthy: "(^_^)", wilting: "(._.)", dormant: "(-_-)z" },
  },
  pixelcat: {
    id: "pixelcat",
    name: "Pixel-cat",
    emoji: "🐱",
    defaultPersonality: "sarcastic",
    faces: { thriving: "=^◕ᴥ◕^=", healthy: "=^•ᴥ•^=", wilting: "=^-ᴥ-^=", dormant: "=^=ᴥ=^=" },
    asciiFaces: { thriving: "=^o.o^=", healthy: "=^-.-^=", wilting: "=^;.;^=", dormant: "=^z.z^=" },
  },
  slime: {
    id: "slime",
    name: "Slime",
    emoji: "🟢",
    defaultPersonality: "chill",
    faces: { thriving: "(づ◕‿‿◕)づ", healthy: "(◕‿◕)", wilting: "(´_‿_`)", dormant: "(˘ω˘)zzz" },
    asciiFaces: { thriving: "(b^_^)b", healthy: "(^_^)", wilting: "(~_~)", dormant: "(-.-)z" },
  },
};

export function speciesOf(id: string): Species {
  return SPECIES[id] ?? SPECIES[DEFAULT_SPECIES]!;
}

export function faceFor(speciesId: string, tier: Tier, ascii = false): string {
  const sp = speciesOf(speciesId);
  return (ascii ? sp.asciiFaces : sp.faces)[tier];
}
