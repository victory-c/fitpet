// Higher means more concern. Adapted from Touch Grass Protocol's severity semantics.
import { DEBT_THRESHOLDS } from "../config.ts";

export type Severity = "NORMAL" | "CONCERNING" | "DEGRADED" | "CRITICAL";
const RANK: Record<Severity, number> = { NORMAL: 0, CONCERNING: 1, DEGRADED: 2, CRITICAL: 3 };
export function severityOf(score: number): Severity {
  if (score >= DEBT_THRESHOLDS.CRITICAL) return "CRITICAL";
  if (score >= DEBT_THRESHOLDS.DEGRADED) return "DEGRADED";
  if (score >= DEBT_THRESHOLDS.CONCERNING) return "CONCERNING";
  return "NORMAL";
}
export function severityRank(severity: Severity): number { return RANK[severity]; }
export type SeverityTransition = "escalated" | "deescalated" | "entered_critical" | "recovered";
export function severityTransitions(before: number, after: number): SeverityTransition[] {
  const prev = severityOf(before), next = severityOf(after);
  const transitions: SeverityTransition[] = [];
  if (severityRank(next) > severityRank(prev)) transitions.push("escalated");
  if (severityRank(next) < severityRank(prev)) transitions.push("deescalated");
  if (next === "CRITICAL" && prev !== next) transitions.push("entered_critical");
  if (prev !== "NORMAL" && next === "NORMAL") transitions.push("recovered");
  return transitions;
}