# Cline hook adapter contract

FitPet supports two external file-hook envelopes without importing Cline, a dashboard,
or any new runtime dependency. The hook adapter is intentionally activity-only and read-only
with respect to pet state. Event arrival uses the same privacy-filtered journal as Claude Code.

## Upstream references

Reviewed against Cline's official `main` source during implementation:

- `https://github.com/cline/cline/blob/main/sdk/examples/hooks/README.md`
  — CLI lifecycle mapping, `.cline/hooks`, stdin/stdout examples, VS Code placement note.
- `https://github.com/cline/cline/blob/main/apps/vscode/src/sdk/hooks-adapter.ts`
  — currently wired extension events and `postToolUse.success`.
- `https://github.com/cline/cline/blob/main/apps/vscode/src/core/hooks/hook-factory.ts`
  — extensionless executable discovery and hook payload envelope.
- `https://github.com/cline/cline/blob/main/sdk/packages/core/src/hooks/hook-file-config.ts`
  — CLI event basenames and supported filename extensions.
- `https://github.com/cline/cline/blob/main/sdk/packages/core/src/hooks/hook-file-hooks.ts`
  — CLI `tool_call` / `tool_result` payloads and interpreter selection.

These are moving upstream references, not a promise that every installed release exposes
every event. Recheck them when upgrading Cline. The VS Code SDK bridge explicitly defers
TaskResume, TaskError, SessionShutdown, PreCompact, and Notification; its older documentation
may list a broader set. FitPet installs only the currently wired subset for this host.

## Envelope examples

VS Code success classification reads only event name, tool name, and success:

```json
{"hookName":"PostToolUse","postToolUse":{"toolName":"apply_patch","success":true}}
```

CLI uses normalized serialized names:

```json
{"hookName":"tool_result","tool_result":{"name":"apply_patch","error":null}}
```

Both yield a journal entry with only local ISO timestamp `t` and `kind: "edit"`.
No host-controlled timestamp or identifier is persisted. For CLI errors, only the presence
of a nonempty error string is inspected; contents are never stored or echoed.

## Safety and limitations

- Generated shell launchers explicitly use the installer Node executable, not the upstream
  default Bun interpreter for `.ts` hook files. Install requires Node >=23.6 as usual.
- Nonblocking JSON response on success, malformed stdin, unknown events, and journal failure.
- Existing hook conflicts abort before writes. Failed installation rolls back newly created
  files only. Empty directories may remain after a failed install/uninstall.
- Exact-content ownership is conservative: edited hooks and launchers generated using a
  different executable/repository path require manual review, not automatic deletion.
- The installer checks destination ancestors, final symlinks, and alternate hook filenames.
  It is not a security boundary against another process maliciously racing directory changes.
- Global hooks may also fire; this installer does not inspect or modify them. Duplicate
  observations cannot double elapsed duration, but more frequent events can change inferred gaps.
- No live Cline host installation was detected; fixture contracts and real generated launcher
  processes are tested, but host UI/settings activation must be confirmed on the user's release.
