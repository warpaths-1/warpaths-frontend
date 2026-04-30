# Session Prompt Wrapper — Pre-flight & Close-out
## Reusable scaffolding for all CC build sessions

This file defines the standard pre-flight and close-out steps that
every CC build session runs. It exists because of three failure
modes encountered during 2026 development:

1. **Stranded work on `claude/` branches.** Sessions completed work
   that was never merged to main. The CHAT-HANDOFF policy "all
   commits go to main" was policy-only, not enforced anywhere.
   Session 5a's work was nearly lost; recoverable only because the
   worktree directory still existed on disk.
2. **Asserted-but-unverified state.** Both human and CC have
   repeatedly claimed prior work landed when it hadn't. The audit-
   driven discipline applied to API contracts ("OpenAPI wins,
   probe before trust") needs to extend to repo state.
3. **Worktree-vs-launch-CWD bugs.** Earlier sessions ran inside
   worktrees with broken `.claude/launch.json` configs, meaning
   "verification" was happening against parent-repo files instead
   of the worktree's actual changes.

This wrapper encodes the lessons. Every build session prompt
references this file at the top and ends with the close-out
sequence below.

---

## How to use this wrapper

Each session prompt should include two references:

**At the top of the session prompt, add:**
```
## Pre-flight (required before any work)

Run all steps in `~/dev/warpaths-frontend/docs/cc-prompts/_session-wrapper.md`
under "PRE-FLIGHT SEQUENCE" before reading the rest of this prompt.
If any pre-flight check fails, STOP and report.
```

**At the end of the session prompt's Process / Acceptance section,
add:**
```
## Close-out (required final steps)

Run all steps in `~/dev/warpaths-frontend/docs/cc-prompts/_session-wrapper.md`
under "CLOSE-OUT SEQUENCE" as the final session activity. Do not
declare the session complete until close-out passes.
```

The wrapper is the source of truth for these steps. Don't copy
them into individual prompts — reference this file. When the
wrapper is updated (e.g., a new failure mode is identified and
encoded), all future sessions inherit the update automatically.

---

## PRE-FLIGHT SEQUENCE

Run these steps in order, before any task work. If any fails,
STOP and report — do not work around it.

### Pre-flight 1: Confirm working directory and branch

```
pwd
git rev-parse --abbrev-ref HEAD
git status
```

Expected:
- `pwd` ends in the parent repo (e.g., `/c/Users/tomna/Dev/warpaths-frontend`),
  NOT a `.claude/worktrees/<name>/` path
- Branch is `main` (or whatever the session prompt explicitly
  specifies — most build sessions want main)
- `git status` is either clean or contains only known/expected
  uncommitted state

If pwd ends in `.claude/worktrees/...`:
- Claude Code has spawned a worktree. The desktop app does this
  automatically and is not (currently) configurable to disable.
- This is acceptable IF the close-out sequence's merge step lands
  the work on main correctly.
- Report the worktree name and branch (e.g.,
  `.claude/worktrees/quizzical-name-abc123/`, branch
  `claude/quizzical-name-abc123`). The session can proceed; the
  close-out sequence will merge to main.

If branch is anything other than `main` or `claude/<name>`:
- STOP. Something unusual is going on. Report the actual branch.

If `git status` shows unexpected uncommitted changes:
- Do NOT clobber them. Report what's there. The human decides
  whether to commit, stash, or discard before proceeding.

### Pre-flight 2: Confirm main is current

```
git fetch origin
git log main..origin/main --oneline   # commits on remote not in local
git log origin/main..main --oneline   # commits in local not on remote
```

Expected: both empty, OR local is ahead of origin (local commits
not yet pushed are fine; remote commits not yet pulled are not).

If origin is ahead of local:
- STOP. Report the unpulled commits. The session is starting from
  stale state; pulling could change what files exist or what the
  task should do.

### Pre-flight 3: Confirm prerequisite work exists

This is the key "verify, don't assert" check. Many sessions depend
on prior sessions having actually landed their work. Verify
explicitly.

The session prompt should specify what to check. At minimum, run:

```
ls src/api/ | sort     # confirm expected api modules exist
git log main --oneline -10
```

If the session prompt names specific files or commits as
prerequisites, confirm each:

```
test -f <expected-path> && echo "FOUND: <expected-path>" || echo "MISSING: <expected-path>"
git log main --oneline | grep -i <expected-feature-keyword>
```

If any prerequisite is missing:
- STOP. Report what's missing. The session cannot proceed with
  unmet prerequisites; this is exactly the failure mode that
  produced the Session 5b → "scenarioChildren.js doesn't exist"
  blocker.

### Pre-flight 4: Confirm scratch directory and report file plan

State which files this session will create/modify. Be specific.
Don't say "various form components" — say
`src/pages/authoring/steps/Step5Dimensions.jsx`. This is a sanity
check on the session prompt itself; if you can't enumerate the
files now, the prompt is too vague.

Also note: any temporary scratch files (probe responses, ID dumps,
etc.) should be created in `/tmp/` or with `tmp_` prefix in the
repo root. They must NOT be committed; close-out enforces this.

### Pre-flight report

Post a single message containing:
- Working directory (`pwd` output)
- Branch (`git rev-parse --abbrev-ref HEAD` output)
- Whether a worktree was spawned (and if so, its name)
- Status of main vs origin/main
- Prerequisite check results
- Planned file changes
- Any anomalies

Wait for the human's "go" before proceeding to session work.

---

## CLOSE-OUT SEQUENCE

Run these steps in order, as the final session activity. The
session is not complete until all of these pass.

### Close-out 1: Verify build still passes

```
npm run build
```

Must succeed. If it fails, STOP. Do not commit broken code.

### Close-out 2: Identify all file changes

```
git status
```

Confirm:
- Every changed/new file matches the pre-flight planned-files list
- No unexpected files are modified
- No scratch files are present (no `tmp_*`, no `*.scratch`, no
  probe response dumps)

If scratch files exist:
- Either delete them or move them to `/tmp/` before proceeding
- Confirm via `git status` that they no longer appear

If unexpected files are modified:
- Report them. The human decides whether they should be committed,
  reverted, or are an artifact of session work that wasn't planned
  for.

### Close-out 3: Stage with explicit paths

Per `~/dev/warpaths-frontend/CLAUDE.md`: never use `git add .` or
`git add -A`. Always specify exact paths.

```
git add <path-1>
git add <path-2>
...
git status
git diff --cached --stat
```

Confirm the staged file list matches the planned-files list
exactly. If a file is staged that wasn't planned, unstage it
(`git reset HEAD <path>`) and report.

### Close-out 4: Commit

Use a commit message following the repo's existing convention
(e.g., `feat(authoring): ...`, `fix(api): ...`, `docs: ...`).

```
git commit -m "<commit message>"
git log --oneline -3
```

If the session was on a `claude/<name>` branch (worktree):
- The commit is now on `claude/<name>`, NOT on main
- Proceed to Close-out 5 (merge to main)

If the session was directly on main (no worktree):
- The commit is on main already
- Skip Close-out 5, proceed to Close-out 6

### Close-out 5: Merge to main (worktree sessions only)

```
git -C <parent-repo-path> checkout main
git -C <parent-repo-path> merge --ff-only <claude/branch-name>
git -C <parent-repo-path> log main --oneline -3
```

The `--ff-only` flag is a guardrail: if main has moved during the
session (a separate session committed, or the human pulled new
work), the fast-forward merge will fail. That's a feature, not a
bug — it surfaces the conflict instead of silently producing a
merge commit. If `--ff-only` fails:
- STOP. Report what happened. The human decides whether to rebase
  the worktree branch onto main, or to merge with a merge commit,
  or to investigate the divergence.

After successful merge, return to the worktree path so the
session's working state isn't disrupted:

```
cd <worktree-path>
```

### Close-out 6: Verify the commit is actually on main

This is the load-bearing verification. Without it, "I committed"
means nothing.

```
git -C <parent-repo-path> log main --oneline -3
git -C <parent-repo-path> log main --oneline -1 -- <one-of-the-modified-files>
```

The first command must show your commit at the top of main's
history. The second must show your commit as the most recent
change to one of the files you modified.

If either check fails:
- STOP. Report exactly what happened. The work is not on main
  despite the close-out steps appearing to succeed; this is the
  exact failure mode that stranded Session 5a's work.

### Close-out 7: Final report

Post a single closing message containing:

- Confirmation that build passes
- The commit hash on main
- `git log --oneline -3 main` output
- Confirmation that no scratch files were committed
- The list of files changed (matching pre-flight plan)
- Any deferred items, BACKLOG entries added, or follow-ups
  identified during the session
- Any IDs created in the test database (per the test data
  hygiene convention from CHAT-HANDOFF.md)

---

## Notes for prompt authors

When writing a new session prompt that uses this wrapper:

- **Pre-flight 3** must be customized per session. Specify which
  prior sessions' work this session depends on, and which files
  must exist. Generic "ls src/api" isn't enough — name the
  specific module files and commit keywords.
- **Pre-flight 4** must enumerate the planned files. If the
  prompt's scope changes during work, that's fine — but the
  pre-flight enumeration becomes a checkpoint to flag scope drift.
- **Close-out 3** staging paths come from the pre-flight 4 plan.
  Discrepancies between planned and actual are not failures, but
  they are signals worth surfacing.
- The wrapper does NOT replace session-specific PV (pre-build
  verification) for API contracts. PV phases for OpenAPI schema
  extraction, catalogue drift checks, etc. happen between
  pre-flight and the build work, in the session prompt's own PV
  section.

---

## Wrapper version history

- v1, 2026-04-29 — initial draft after Session 5a recovery and
  worktree-branching investigation
