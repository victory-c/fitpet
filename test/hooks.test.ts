import { test } from "node:test";
import assert from "node:assert/strict";
import { isTestCommand, eventForPostToolUse, eventForFailure } from "../src/hooks/hooklib.ts";

test("isTestCommand matches common runners, not arbitrary Bash", () => {
  assert.ok(isTestCommand("npm test"));
  assert.ok(isTestCommand("npm run test -- --watch"));
  assert.ok(isTestCommand("pytest tests/"));
  assert.ok(isTestCommand("node --test"));
  assert.ok(isTestCommand("go test ./..."));
  assert.ok(isTestCommand("cargo test"));
  assert.equal(isTestCommand("npm run build"), false);
  assert.equal(isTestCommand("ls -la"), false);
  assert.equal(isTestCommand("git commit -m 'test the waters'"), false);
});

test("eventForPostToolUse maps successful tools to events", () => {
  assert.equal(eventForPostToolUse({ tool_name: "Bash", tool_input: { command: "npm test" } }), "test_pass");
  assert.equal(eventForPostToolUse({ tool_name: "Bash", tool_input: { command: "ls" } }), null);
  assert.equal(eventForPostToolUse({ tool_name: "Edit", tool_input: { file_path: "/x" } }), "edit");
  assert.equal(eventForPostToolUse({ tool_name: "Write" }), "edit");
  assert.equal(eventForPostToolUse({ tool_name: "Read" }), null);
});

test("eventForFailure maps failed tools to events", () => {
  assert.equal(eventForFailure({ tool_name: "Bash", tool_input: { command: "pytest" } }), "test_fail");
  assert.equal(eventForFailure({ tool_name: "Bash", tool_input: { command: "make" } }), "error");
  assert.equal(eventForFailure({ tool_name: "Edit" }), "error");
});
