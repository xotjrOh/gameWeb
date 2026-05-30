# Codex Hook Harness

This repo uses project-local Codex hooks to keep deterministic agent checks close to
the codebase.

## Files

- `.codex/config.toml` enables Codex lifecycle hooks for this project.
- `.codex/hooks.json` wires Codex lifecycle events to the local harness script.
- `.codex/hooks/codex-harness.cjs` injects task-specific context, suggests the
  smallest validation set from changed files, blocks obvious destructive shell
  commands, and asks Codex to continue if it tries to finish without validation
  evidence after file changes.

## Trust

Codex requires non-managed hooks to be reviewed before they run. Open `/hooks` in a
Codex session from this repo and trust the project-local hook definitions after
reviewing them.

## Manual Checks

Run these from the repo root:

```powershell
node --preserve-symlinks-main .codex/hooks/codex-harness.cjs --self-test
node --preserve-symlinks-main .codex/hooks/codex-harness.cjs --classify
```

`--self-test` validates the script behavior. `--classify` prints the current
changed files and the validation command set the harness would recommend.
