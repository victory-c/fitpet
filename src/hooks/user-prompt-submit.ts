#!/usr/bin/env node
import { readHookInput } from "./hooklib.ts";
import { recordActivity } from "../local-activity/classify.ts";

try {
  recordActivity(readHookInput(), "UserPromptSubmit");
} catch { /* never break a session */ }
process.exit(0);