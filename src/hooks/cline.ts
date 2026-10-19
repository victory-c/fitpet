#!/usr/bin/env node
// Observe only. Never block Cline, inject context, echo errors, or mutate pet state.
import { readFileSync } from "node:fs";
import { classifyClineHook } from "../local-activity/cline.ts";
import { appendActivity } from "../local-activity/log.ts";

try {
  const raw: unknown = JSON.parse(readFileSync(0, "utf8"));
  const kind = classifyClineHook(raw);
  if (kind) appendActivity({ t: new Date().toISOString(), kind });
} catch { /* malformed input or unavailable journal: allow Cline to continue */ }
process.stdout.write('{"cancel":false}\n');
process.exit(0);
