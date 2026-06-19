#!/usr/bin/env node
// Stop: the per-turn "heartbeat". Just advance the sim (ease vitality toward the last
// known fitness score, tick age/healthyDays). No quip — that would be noisy every turn.

import { tickAndSave } from "./hooklib.ts";

try {
  tickAndSave();
} catch {
  /* never break a session */
}
process.exit(0);
