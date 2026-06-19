#!/usr/bin/env node
// PostToolUse (fires after a tool SUCCEEDS): celebrate a passing test, and react to edits.
// Edits are common, so we only react to a fraction of them to keep the pet lively, not spammy.

import { readHookInput, eventForPostToolUse, reactAndSave } from "./hooklib.ts";

const EDIT_REACT_CHANCE = 0.34;

try {
  const event = eventForPostToolUse(readHookInput());
  if (event === "edit") {
    if (Math.random() < EDIT_REACT_CHANCE) reactAndSave("edit");
  } else if (event) {
    reactAndSave(event);
  }
} catch {
  /* never break a session */
}
process.exit(0);
