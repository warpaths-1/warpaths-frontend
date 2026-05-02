# Plan-Mode Workflow Migration

## Context

The WarPaths workspace is moving from a chat-era session-prompt workflow to a CC plan-mode-first workflow. The chat-era artifacts (`docs/cc-prompts/`, `docs/build-plans/`, `docs/handoffs/`) and the audit-driven prompt-revision two-pass pattern are being retired. They are replaced by:

- A per-feature plan doc (`docs/plans/<FEATURE>.md`) — current-state tracker for in-flight features
- A durable cross-page decisions doc (`docs/decisions.md`) — architectural conventions
- Updated `CLAUDE.md` files in all three locations (`~/dev/`, `warpaths-frontend/`, `warpaths-api/`) referencing the new workflow

Source files are already drafted in `~/Downloads/`. This migration executes [MIGRATION-CHECKLIST.md](file:///C:/Users/tomna/Downloads/MIGRATION-CHECKLIST.md) end-to-end in a single session and lands the migration as one commit per repo.

---

## Pre-flight findings (verified)

| Check | Status |
|---|---|
| `warpaths-frontend` on `main`, HEAD = `6db57ce` | ✅ Matches checklist |
| `warpaths-frontend` working tree | ⚠️ 5 untracked files in `docs/cc-prompts/` (SESSION-05c, 05d, 06, 07, 08) — **decision: archive with the rest** |
| `warpaths-api` working tree | ✅ Clean (branch is `master`, not `main` — irrelevant to this migration) |
| `~/dev/` is a git repo | ❌ Not a repo — workspace `CLAUDE.md` is a loose file. Step 6 third commit does not apply |
| External references to `cc-prompts` / `build-plans` / `handoffs` | ✅ Only inside the to-be-archived files themselves and one line in `~/dev/CLAUDE.md` (handled by Edit B) |

---

## Conflicts vs. patch instructions (resolved)

1. **Frontend CLAUDE.md Edit B (Find/Replace)** — patch's "Find" block jumps from `docs/` straight to `pages/`, but the real file (lines 52–64) lists `design-tokens.md`, `components.md`, `page-design-patterns.md`, `query-keys.md` between them. Resolution: per user's choice to rename lowercase page specs to PascalCase, **revert Edit B** as the migration checklist Step 4 advises — but **add a single new line for `AuthoringPage.md`** to the existing pages listing, since the original table omits it.

2. **Frontend CLAUDE.md Edit C (Find)** — patch quotes only the first sentence of the page-specs paragraph; the actual paragraph is longer. Insertion target is unambiguous (insert after the existing paragraph, before the next paragraph beginning "When a new page is needed…"). Apply as a paragraph insert rather than literal find/replace.

3. **Workspace `~/dev/CLAUDE.md` Edit C** — patch says "Add two rows" but does not show the surrounding table. Rows append cleanly to the bottom of the existing 7-row warpaths-frontend key-documents table.

All other Find strings match verbatim.

---

## Decisions (confirmed with user)

- **Page-spec filenames:** rename 5 lowercase → PascalCase (`account.md` → `AccountPage.md`, etc.). Revert Edit B in frontend CLAUDE.md, add only the missing `AuthoringPage.md` row.
- **Untracked SESSION-*.md drafts in cc-prompts/:** archive with the rest of `cc-prompts/` (preserved as historical reference, included in migration commit).

---

## Execution order

### Step 1 — Stage new docs in `warpaths-frontend/`
- Create `docs/plans/` directory
- Copy `~/Downloads/AUTHORING-PAGE.md` → `docs/plans/AUTHORING-PAGE.md`
- Copy `~/Downloads/frontend-decisions.md` → `docs/decisions.md` (lowercase filename — intentional, distinct from the API repo's PascalCase `DECISIONS.md`)

### Step 2 — Apply CLAUDE.md edits

**`~/dev/CLAUDE.md`** (workspace root, loose file):
- **Edit A**: replace "Audit-driven session prompt revision (April 2026 audit)" subsection (lines 257–272 approx) with the "Plan-mode-first workflow" subsection from `CLAUDE-md-updates.md` §1
- **Edit B**: replace the AuthoringPage status line under "Frontend" → "Current State" (line 175–177) with the new one referencing `docs/plans/AUTHORING-PAGE.md`
- **Edit C**: append two rows to the warpaths-frontend key-documents table at the bottom — `docs/decisions.md` and `docs/plans/<FEATURE>.md`

**`~/dev/warpaths-frontend/CLAUDE.md`**:
- **Edit A**: insert the new "Plan-Mode Workflow" section between the "Context" section (ends line 23) and "Tech Stack" (line 26)
- **Edit B (revised)**: instead of replacing the whole `pages/` block, simply insert one new line `AuthoringPage.md` into the existing PascalCase listing (lines 57–64). The existing PascalCase table already matches what the renamed disk will look like.
- **Edit C**: insert the new paragraph about `docs/plans/` immediately after the existing "Every page has a spec doc in `docs/pages/`. Read it before building or modifying that page. File names match…" paragraph (lines 179–192), before the "When a new page is needed…" paragraph

**`~/dev/warpaths-api/CLAUDE.md`**:
- **Edit A**: insert the new "Plan-Mode Workflow" section after the "Read These Before Starting Any Session" block (after line 34, before the `---` divider at line 35)

### Step 3 — Archive chat-era artifacts in `warpaths-frontend/`
- Create `docs/archive/`
- Move `docs/cc-prompts/` (entire folder — tracked files via `git mv`, the 5 untracked SESSION drafts via plain `mv`, then `git add` the new locations) → `docs/archive/cc-prompts/`
- Move `docs/build-plans/AuthoringPage-BuildOrder.md` → `docs/archive/AuthoringPage-BuildOrder.md` (the only file in `build-plans/`)
- Move `docs/handoffs/Frontend_HANDOFF.md` → `docs/archive/handoffs/Frontend_HANDOFF.md` (no external refs to it; safe to archive)
- Write `docs/archive/README.md` — one line: "Pre-plan-mode workflow artifacts. Retained for historical reference. Not authoritative — see `docs/plans/` and `docs/decisions.md`."
- **Copy this plan file** (`C:\Users\tomna\.claude\plans\c-users-tomna-downloads-authoring-page-streamed-robin.md`) → `docs/archive/migration-plan-2026-05-02.md` so the executed plan is preserved alongside the artifacts it retired

### Step 4 — Reconcile page-spec filenames in `warpaths-frontend/`
- `git mv docs/pages/account.md docs/pages/AccountPage.md`
- `git mv docs/pages/game.md docs/pages/GamePage.md`
- `git mv docs/pages/leaderboard.md docs/pages/LeaderboardPage.md`
- `git mv docs/pages/org-management.md docs/pages/OrgManagementPage.md`
- `git mv docs/pages/signup.md docs/pages/SignupPage.md`

### Step 5 — Verify
- `cd warpaths-frontend && npm run build` — must pass with zero errors and zero warnings
- `cd warpaths-frontend && npm test` — must pass
- `grep -r "cc-prompts" docs/ --exclude-dir=archive` — empty
- `grep -r "build-plans" docs/ --exclude-dir=archive` — empty
- `grep -r "AuthoringPage-BuildOrder" docs/ --exclude-dir=archive` — empty
- Open each modified `CLAUDE.md` and visually confirm edits applied as intended
- Open `docs/plans/AUTHORING-PAGE.md` — confirm it reads correctly as a standalone source of truth

### Step 6 — Commit (two commits, no third)

**`warpaths-frontend/`** — single commit with explicit paths only (no `git add .` / `-A`):
```
git add docs/plans/AUTHORING-PAGE.md
git add docs/decisions.md
git add docs/archive/
git add docs/pages/AccountPage.md docs/pages/GamePage.md \
        docs/pages/LeaderboardPage.md docs/pages/OrgManagementPage.md \
        docs/pages/SignupPage.md
git add CLAUDE.md
# stage deletions for old paths (git mv handles most; verify with git status)
git status                          # human review before commit
git commit -m "Migrate to plan-mode-first workflow

- Add docs/plans/AUTHORING-PAGE.md as feature plan
- Add docs/decisions.md for durable cross-page conventions
- Archive chat-era cc-prompts, build-plans, handoffs
- Rename page specs to PascalCase
- Update CLAUDE.md to reference plan-mode workflow"
```

**`warpaths-api/`** — single commit:
```
git add CLAUDE.md
git status                          # human review before commit
git commit -m "Add plan-mode workflow note to CLAUDE.md"
```

**`~/dev/CLAUDE.md`** — **no commit** (not a git repo). The edited file lives loose; preserved by your filesystem.

**Do not push** — checklist says push, but per workspace conventions, stage for human review and let you push after reviewing the commits locally.

---

## Critical files to be modified

- `C:\Users\tomna\Dev\CLAUDE.md` (loose file, workspace root)
- `C:\Users\tomna\Dev\warpaths-frontend\CLAUDE.md`
- `C:\Users\tomna\Dev\warpaths-api\CLAUDE.md`

## Critical files to be created

- `C:\Users\tomna\Dev\warpaths-frontend\docs\plans\AUTHORING-PAGE.md`
- `C:\Users\tomna\Dev\warpaths-frontend\docs\decisions.md`
- `C:\Users\tomna\Dev\warpaths-frontend\docs\archive\README.md`
- `C:\Users\tomna\Dev\warpaths-frontend\docs\archive\migration-plan-2026-05-02.md` (copy of this plan file)

## Files to be moved (`git mv` where possible)

- `docs/cc-prompts/` (10 tracked files + 5 untracked) → `docs/archive/cc-prompts/`
- `docs/build-plans/AuthoringPage-BuildOrder.md` → `docs/archive/AuthoringPage-BuildOrder.md`
- `docs/handoffs/Frontend_HANDOFF.md` → `docs/archive/handoffs/Frontend_HANDOFF.md`
- `docs/pages/{account,game,leaderboard,org-management,signup}.md` → `docs/pages/{AccountPage,GamePage,LeaderboardPage,OrgManagementPage,SignupPage}.md`

---

## Verification (end-to-end test plan)

1. **Build & tests pass**: `npm run build` (zero warnings), `npm test` (passes) in `warpaths-frontend/`.
2. **No stale references**: three grep checks in Step 5 all return empty (or only matches inside `docs/archive/`).
3. **Doc tree readable**:
   - `ls docs/plans/` → only `AUTHORING-PAGE.md`
   - `ls docs/pages/` → 8 PascalCase `*.md` files (AccountPage, AuthoringPage, ExtractionPage, GamePage, LeaderboardPage, LoginPage, OrgManagementPage, SignupPage)
   - `ls docs/archive/` → `cc-prompts/`, `handoffs/`, `AuthoringPage-BuildOrder.md`, `README.md`
   - `docs/cc-prompts/`, `docs/build-plans/`, `docs/handoffs/` all gone
4. **CLAUDE.md visual sanity check**: open each of the three edited CLAUDE.md files; confirm new sections render in markdown and patch text is in the right place.
5. **Git status pre-commit review**: `git status` in `warpaths-frontend/` and `warpaths-api/` — confirm only the intended files are staged before committing.
6. **First plan-mode dry run** (post-commit): start a fresh CC session in `warpaths-frontend/`, enter plan mode, ask CC to plan AuthoringPage Step 6 (EvaluationCriteria) referencing the three new docs as opening context. Confirm CC reads them and produces a coherent plan — proves the new workflow is bootable.

---

## Source-file location (confirmed)

The four source files live at `C:\Users\tomna\Downloads\` (i.e. `~/Downloads/`):
- `AUTHORING-PAGE.md`
- `frontend-decisions.md`
- `MIGRATION-CHECKLIST.md`
- `CLAUDE-md-updates.md`

If any of these are not at that path at execution time, halt and ask before continuing.

## Out of scope

- No code changes outside `CLAUDE.md` files and the doc tree
- No push to remote — confirmed; you'll push after local review
- No edits to `docs/pages/AuthoringPage.md`, `ExtractionPage.md`, `LoginPage.md` (these are already PascalCase and correct)
- No edits to the API repo beyond its single `CLAUDE.md` insertion
- No changes to `~/dev/api-audit/deliverables/` (referenced in the new workspace CLAUDE.md text as historical context only)
