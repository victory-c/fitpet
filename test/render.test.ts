import { test } from "node:test";
import assert from "node:assert/strict";
import { renderFace, vitalityBar, safeFace } from "../src/render.ts";
import { defaultState } from "../src/state.ts";
import type { PetState } from "../src/types.ts";

const NOW = "2026-06-02T00:00:00.000Z";

function pet(overrides: Partial<PetState> = {}): PetState {
  return { ...defaultState(NOW), ...overrides };
}

test("vitalityBar fills proportionally and stays the right width", () => {
  assert.equal(vitalityBar(0, 8), "░░░░░░░░");
  assert.equal(vitalityBar(100, 8), "████████");
  assert.equal(vitalityBar(50, 8).length, 8);
});

test("renderFace shows the pet, a bar, and an idle tail when no reaction", () => {
  const line = renderFace(pet({ vitality: 80 }), { nowIso: NOW });
  assert.match(line, /🌱/);
  assert.match(line, /Pixel/); // idle tail = name · tier
  assert.match(line, /thriving/);
});

test("renderFace shows a live reaction quip instead of the idle tail", () => {
  const p = pet({ vitality: 60 });
  p.reaction = { text: "tests green!", face: "(^_^)", event: "test_pass", setAt: NOW, ttlSeconds: 90 };
  const line = renderFace(p, { nowIso: NOW });
  assert.match(line, /tests green!/);
});

test("an expired reaction is ignored (falls back to the idle tail)", () => {
  const p = pet({ vitality: 60 });
  p.reaction = { text: "stale quip", face: "(^_^)", event: "edit", setAt: NOW, ttlSeconds: 90 };
  const later = "2026-06-02T00:05:00.000Z"; // 5 min later, past the 90s TTL
  const line = renderFace(p, { nowIso: later });
  assert.doesNotMatch(line, /stale quip/);
});

test("low context triggers the panic face and tail", () => {
  const line = renderFace(pet({ vitality: 90 }), { usedPercent: 92, nowIso: NOW });
  assert.match(line, /context low!/);
});

test("safeFace is never empty", () => {
  assert.ok(safeFace().trim().length > 0);
});
