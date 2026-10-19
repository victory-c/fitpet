#!/usr/bin/env node
// PostToolUseFailure (fires after a tool FAILS): sympathize with a failing test or a
// general error. This is the doc-correct home for "error" reactions (PostToolUse only
// fires on success).

import { readHookInput, eventForFailure, reactAndSave } from "./hooklib.ts";
import { recordActivity } from "../local-activity/classify.ts";

try {
  const input = readHookInput();
  recordActivity(input, "PostToolUseFailure");
  const event = eventForFailure(input);
  if (event) reactAndSave(event);
} catch {
  /* never break a session */
}
process.exit(0);
