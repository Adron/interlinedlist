---
name: comment-and-commit-and-push-for-pr
description: >-
  Stages all uncommitted changes, commits with a descriptive message, pushes the
  branch (setting upstream tracking if needed), and opens a GitHub pull request
  via the gh CLI with a well-structured description. Use whenever the user wants
  to ship their current work as a PR.
---

# comment-and-commit-and-push-for-pr skill

Stage every uncommitted change, commit, push the branch to origin (wiring up tracking if it has none), and open a GitHub pull request with a thorough description.

## Prerequisites check

Before doing anything else, verify the environment is ready:

```bash
which gh && gh auth status
```

- If `gh` is not found: stop and tell the user to install it (`brew install gh`) and authenticate (`gh auth login`).
- If `gh` is not authenticated: stop and tell the user to run `gh auth login`.
- Confirm the required token scope includes `repo`. If not, the user must re-authenticate with `gh auth refresh -s repo`.

## Step-by-step

### 1. Snapshot current state

Run these four commands **in parallel**:

```bash
git status
git diff HEAD
git log --oneline -10
git remote -v
```

- `git status` — shows untracked and modified files.
- `git diff HEAD` — full diff of staged + unstaged changes relative to HEAD.
- `git log --oneline -10` — reveals commit-message style and conventions in this repo.
- `git remote -v` — confirms a remote named `origin` exists.

If no `origin` remote exists, stop and ask the user to add one:

```
git remote add origin <url>
```

### 2. Analyse the diff

Read the diff carefully. For each changed file identify:

- **What** changed (new feature, bug fix, refactor, test, docs, config, dependency).
- **Why** it changed — infer from context, variable names, surrounding code, and file paths.
- Whether any file should **not** be committed (`.env`, secrets, large binaries, untracked lock files). If spotted, pause and ask.

### 3. Stage the files

Prefer explicit file names over `git add -A` so accidental inclusions are visible:

```bash
git add <file1> <file2> ...
```

Use `git add -A` only when the entire working tree is safe to stage.

Do **not** stage:
- `.env`, `.env.*`, or any file likely to contain secrets
- Large binary files unless explicitly requested

### 4. Draft and create the commit

Follow conventions from `git log`. Default structure when no convention is evident:

```
<imperative-mood summary, ≤72 chars>

- Bullet for each logical change group
- Focus on WHY, not WHAT

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Create the commit via heredoc:

```bash
git commit -m "$(cat <<'EOF'
<subject line>

<body>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

If the pre-commit hook fails: fix the issue, re-stage, and create a **new** commit. Never use `--no-verify`.

### 5. Determine upstream tracking and push

Check whether the current branch already has a remote tracking branch:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
```

- **Tracking branch exists**: push normally.

  ```bash
  git push
  ```

- **No tracking branch**: push and set upstream in one command.

  ```bash
  git push -u origin <current-branch>
  ```

  Where `<current-branch>` comes from:

  ```bash
  git rev-parse --abbrev-ref HEAD
  ```

Never force-push. If the push is rejected because the remote has diverged, stop and tell the user — do not rebase or reset without explicit instruction.

### 6. Check for an existing PR

Before creating a new PR, check whether one already exists for this branch:

```bash
gh pr view --json number,url,state 2>/dev/null
```

- **PR already exists**: report its URL and state. Ask the user if they want to update the PR description or just leave it. Do not create a duplicate.
- **No PR exists**: proceed to step 7.

### 7. Draft the PR description

Use the full diff and commit history to write a thorough PR body. Structure it as:

```markdown
## Summary

<2–4 sentences describing the overall change and motivation>

## Changes

- <file or area>: <what changed and why>
- <file or area>: <what changed and why>
(one bullet per logical change group — not one per file)

## Test plan

- [ ] <manually verify X>
- [ ] <check that Y still works>
- [ ] <any migration or env-var steps the reviewer needs to run>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Derive the base branch:
- Use `main` if it exists on the remote, otherwise `master`, otherwise ask the user.

```bash
gh pr create \
  --base <base-branch> \
  --title "<same subject as the commit, ≤72 chars>" \
  --body "$(cat <<'EOF'
<PR body>
EOF
)"
```

### 8. Confirm and report

After the PR is created, report back:

- Commit hash and subject.
- Push result (new branch or existing tracking branch).
- PR URL.
- If anything was skipped (e.g., nothing to commit, PR already existed), explain why.

## Safety rules

| Rule | Reason |
|------|--------|
| Never use `--no-verify` | Pre-commit hooks exist for a reason — fix failures, don't skip them |
| Never force-push | Rewrites shared history; ask the user explicitly if they need it |
| Never amend a published commit | Creates divergence with remote; create a new commit instead |
| Never commit secrets | `.env` and credential files must stay out of git |
| Confirm before committing if diff is >500 lines or touches CI/CD, migrations, or security-sensitive files | Big or risky changes deserve a human checkpoint |
| Never create a duplicate PR | Always check `gh pr view` before `gh pr create` |

## Error handling

- **`gh` not installed or not authenticated**: stop immediately and give setup instructions.
- **Push rejected (non-fast-forward)**: stop, report the divergence, and ask the user how to proceed.
- **No `origin` remote**: stop and ask the user to add one.
- **Pre-commit hook fails**: fix the issue, re-stage, create a new commit.
- **Nothing to commit**: skip commit step, proceed to push + PR if there are unpushed commits.
- **Merge conflict markers in files**: stop and ask the user to resolve conflicts first.
- **PR already open for this branch**: report the existing PR URL and ask the user what they want to do.