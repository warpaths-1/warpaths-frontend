# CC Prompt — Session 5a Recovery + Verification
## Recover uncommitted work, commit to main, verify it functions

## CRITICAL: Launch this session WITHOUT the -w / --worktree flag.

This session must run in the parent repo at `~/dev/warpaths-frontend`
on the `main` branch directly. No worktree spawning.

If you find yourself in a `.claude/worktrees/<name>/` directory at
session start, STOP and report. The human needs to relaunch from
the parent repo without `-w`.

Verify position before proceeding:

```
pwd                          # should end in /warpaths-frontend, not /worktrees/...
git rev-parse --abbrev-ref HEAD   # should report: main
git status                   # should be clean except possibly the items inherited from sad-meitner work (see Task 5)
```

Confirm all three, then proceed.

## Context

Session 5a (Step 4 TensionIndicator) was previously run in worktree
`infallible-brown-048183` on branch `claude/infallible-brown-048183`.
The work was completed but never `git add` / `git commit` was run.
The work survives as uncommitted modifications + an untracked file
in that worktree's filesystem. The branch HEAD is on main's tip
(commit `6c627e2`), so the changes apply cleanly to main with no
rebase needed.

The previous worktree investigation report (this chat session's
predecessor) confirms:

- `src/api/scenarioChildren.js` — new file, 28 lines, TensionIndicator
  API surface
- `src/pages/authoring/steps/Step4Tension.jsx` — 582 lines (was a
  9-line placeholder)
- `src/pages/AuthoringPage.jsx` — +19 lines
- `docs/api-surface.md` — modified
- `docs/query-keys.md` — modified
- `docs/response-shapes.md` — modified
- Probe scratch files: `tmp_*.json`, `tmp_ids.txt` — DO NOT COMMIT

## Scope

Three deliverables:

1. **Recover and commit Session 5a's work to main.**
2. **Verify it actually functions** (build + smoke test).
3. **Note any issues** encountered during recovery for follow-up.

Do NOT do worktree cleanup in this session. That's a separate task.

## Tasks

### Task 1: Locate and inspect the source files

From the parent repo on main, inspect (read-only) the files in the
source worktree:

```
ls -la .claude/worktrees/infallible-brown-048183/src/api/scenarioChildren.js
git -C .claude/worktrees/infallible-brown-048183 status
git -C .claude/worktrees/infallible-brown-048183 diff --stat
```

Confirm the file list matches the investigation report:
- `src/api/scenarioChildren.js` (untracked, new)
- `src/pages/authoring/steps/Step4Tension.jsx` (modified)
- `src/pages/AuthoringPage.jsx` (modified)
- `docs/api-surface.md` (modified)
- `docs/query-keys.md` (modified)
- `docs/response-shapes.md` (modified)
- `tmp_*.json`, `tmp_ids.txt` (untracked scratch — exclude)

If any file is missing or any unexpected file is modified, STOP and
report.

### Task 2: Copy files to main

For each of the six tracked file changes, copy the worktree's
version into the parent repo's working tree on main. Use cp or the
equivalent file-write — do NOT use git's worktree commands (no
`git worktree move`, no `git checkout`).

```
cp .claude/worktrees/infallible-brown-048183/src/api/scenarioChildren.js src/api/scenarioChildren.js

cp .claude/worktrees/infallible-brown-048183/src/pages/authoring/steps/Step4Tension.jsx src/pages/authoring/steps/Step4Tension.jsx

cp .claude/worktrees/infallible-brown-048183/src/pages/AuthoringPage.jsx src/pages/AuthoringPage.jsx

cp .claude/worktrees/infallible-brown-048183/docs/api-surface.md docs/api-surface.md
cp .claude/worktrees/infallible-brown-048183/docs/query-keys.md docs/query-keys.md
cp .claude/worktrees/infallible-brown-048183/docs/response-shapes.md docs/response-shapes.md
```

Do NOT copy the tmp_*.json or tmp_ids.txt files.

After copying, run `git status` in the parent and confirm:
- Six expected files show as modified or new
- No tmp_*.json or tmp_ids.txt show as untracked
- No other unexpected changes

### Task 3: Build and verify

Before committing, run a build to confirm the recovered code is
valid:

```
npm run build
```

If the build fails, STOP and report the error. Do not commit broken
code.

If the build passes, also run any linter the project uses:

```
npm run lint   # if it exists in package.json scripts
```

Report build / lint output.

### Task 4: Smoke test the form

This is the verification step. Session 5a was tested inside its
worktree with the now-fixed launch.json CWD bug active, which
means we don't actually know whether the form works when served
from the parent repo properly.

Start the dev server:

```
npm run dev
```

Note the port and URL.

Then ask the human to perform the smoke test (CC can't drive a
browser):

> Smoke test request — please do the following in your browser at
> the URL the dev server reports:
>
> 1. Log in with test credentials
> 2. Navigate to AuthoringPage
> 3. Open or create a ScenarioConfig
> 4. Advance to Step 4 (Tension)
> 5. Verify form renders with seven scale-label fields plus name,
>    description, initial_value
> 6. If a TensionIndicator already exists from prior testing
>    (check on config 8ade99db-981b-45f9-a3b0-d861de79e49b
>    "Step5a tension test config"), confirm it loads its values
>    correctly
> 7. Try editing one field, click Save & next, verify PATCH fires
>    and step advances
> 8. Report any errors or unexpected behavior

Wait for the human's smoke-test report before proceeding to commit.

If the smoke test surfaces bugs, STOP. Recovery becomes
"recover-and-fix"; we'll handle as a follow-up. If smoke test
passes, proceed to commit.

### Task 5: Commit to main

Once build passes AND smoke test passes:

```
git add src/api/scenarioChildren.js
git add src/pages/authoring/steps/Step4Tension.jsx
git add src/pages/AuthoringPage.jsx
git add docs/api-surface.md
git add docs/query-keys.md
git add docs/response-shapes.md

git status   # confirm only those six files are staged
git diff --cached --stat   # sanity check
```

Use specific paths per the parent CLAUDE.md rule "Never use git
commit without specifying exact file paths."

Commit message:

```
feat(authoring): Step 4 TensionIndicator (recovered from worktree)

Recovered Session 5a work that was completed in worktree
infallible-brown-048183 but never committed. Includes:

- src/api/scenarioChildren.js — new module, TensionIndicator
  API surface (get/create/update)
- Step4Tension.jsx — full TensionIndicator form with extraction
  pre-fill, one-shot seeding via seededRef, auto-commit on Save
  & next, dirty-subset PATCH
- AuthoringPage.jsx — Step 4 advance gate + Step4Tension wiring
- Registry doc updates (api-surface, query-keys, response-shapes)

Per the worktree-branching investigation, this work was stranded
because the prior session used --worktree and the close protocol
did not include a merge-to-main step. Future sessions will not
spawn worktrees.
```

Then verify:

```
git log --oneline -5
git log --oneline -1 -- src/api/scenarioChildren.js
```

Confirm the commit exists on main.

### Task 6: Report

Post a single closing report with:

- Confirmation that build + smoke test passed (or details of any
  issue if not)
- Commit hash on main
- `git log --oneline -3 main` output for the human's records
- A note for BACKLOG: "Worktree `infallible-brown-048183` can now
  be safely removed (commits recovered to main). Other worktrees
  per investigation report's Task 5 audit."
- Confirmation that no scratch files (tmp_*.json, tmp_ids.txt)
  were committed

## Out of scope for this session

- Worktree cleanup / pruning (separate session)
- Reviewing `sad-meitner-889ca8`'s uncommitted CLAUDE.md edits
  (separate decision)
- Anything related to Session 5b or Step 5
- Modifying any of Session 5a's recovered code (recovery only;
  if the smoke test surfaces a bug, stop and we'll handle separately)

## Constraints

- No `-w` / `--worktree` flag at session launch (verify in Task 0)
- Specific file paths for every git add (per CLAUDE.md)
- Do not commit scratch files
- Do not modify the recovered files; just copy + commit as-is
- Stop and report on any unexpected state rather than working around it
