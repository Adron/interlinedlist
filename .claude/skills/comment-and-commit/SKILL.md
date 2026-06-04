---
name: comment-and-commit
description: >-
  Stages all uncommitted changes, generates a descriptive commit message from
  the diff, and commits to the current branch. Use whenever the user asks to
  commit, save, or checkpoint their current work.
---

# comment-and-commit skill

Stage every uncommitted change in the working tree, write a commit message that accurately reflects what changed and why, and create the commit.

## Step-by-step

### 1. Snapshot current state

Run these three commands **in parallel**:

```bash
git status
git diff HEAD
git log --oneline -10
```

- `git status` — shows untracked and modified files.
- `git diff HEAD` — shows the full diff of all staged + unstaged changes relative to HEAD.
- `git log --oneline -10` — reveals the commit-message style and conventions used in this repo.

### 2. Analyse the diff

Read the diff carefully before writing anything. For each changed file identify:

- **What** changed (new feature, bug fix, refactor, test, docs, config, dependency).
- **Why** it changed — infer from context, variable names, surrounding code, and file paths.
- Whether any file looks like it should **not** be committed (`.env`, secrets, large binaries, lock files that weren't already tracked). If you spot one, pause and ask the user.

### 3. Stage the files

Add every file that should be committed. Prefer naming files explicitly over `git add -A` so accidental inclusions are visible:

```bash
git add <file1> <file2> ...
```

If the entire working tree is safe to stage:

```bash
git add -A
```

Do **not** stage:
- `.env`, `.env.*`, or any file likely to contain secrets
- Large binary files unless the user has explicitly asked to include them

### 4. Draft the commit message

Follow the conventions observed in `git log`. If no clear convention exists, use this default structure:

```
<imperative-mood summary, ≤72 chars>

- Bullet for each logical change group
- Focus on WHY, not WHAT (the diff already shows what)
```

**Good summary starters:** `Add`, `Fix`, `Update`, `Remove`, `Refactor`, `Wire up`, `Extract`, `Migrate`

**Avoid:** vague messages like "wip", "changes", "update stuff", "misc fixes".

### 5. Create the commit

Pass the message through a heredoc to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
<subject line>

<body — omit if summary is self-contained>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### 6. Confirm success

Run `git status` after the commit completes. Report back:

- The commit hash and subject line.
- How many files were committed and a one-line summary of each.
- If there are still uncommitted changes, list them and ask the user what to do.

## Safety rules

| Rule | Reason |
|------|--------|
| Never use `--no-verify` | Pre-commit hooks exist for a reason — fix failures, don't skip them |
| Never amend a published commit | Amending rewrites history; create a new commit instead |
| Never force-push | Out of scope for this skill — ask the user if they need it |
| Never commit secrets | `.env` and credential files must stay out of git |
| Confirm before committing if diff is very large (>500 lines) or touches CI/CD, migrations, or security-sensitive files | Big or risky changes deserve a human checkpoint |

## Error handling

- **Pre-commit hook fails**: read the error, fix the underlying issue, re-stage, and create a **new** commit. Never use `--no-verify`.
- **Nothing to commit**: report that the working tree is clean and stop.
- **Untracked files only** (no modifications): stage and commit them normally unless they look like build artifacts.
- **Merge conflict markers present**: stop, report the conflict files, and ask the user to resolve them before committing.
