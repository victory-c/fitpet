#!/usr/bin/env node
// PostToolUseFailure (fires after a tool FAILS): sympathize with a failing test or a
// general error. This is the doc-correct home for "error" reactions (PostToolUse only
// fires on success).

import { readHookInput, eventForFailure, reactAndSave } from "./hooklib.ts";

try {
  const event = eventForFailure(readHookInput());
  if (event) reactAndSave(event);
} catch {
  /* never break a session */
}
process.exit(0);
