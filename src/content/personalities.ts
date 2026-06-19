// Personality = the "voice" that flavors quips. Pluggable: any species can take any one.

import type { Personality } from "../types.ts";

export const PERSONALITIES: Personality[] = ["earnest", "sarcastic", "chill"];

export function isPersonality(x: string): x is Personality {
  return (PERSONALITIES as string[]).includes(x);
}
