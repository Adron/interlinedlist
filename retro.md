# Retrospective: Date Picker UX Regression

**Date:** February 19, 2026  
**Incident:** Date and datetime picker UX improvements were lost in production despite being merged to `develop` and present in `main`'s history.

---

## What Happened

### Timeline

1. **Feb 10, 2026** – Date picker improvements were implemented and merged:
   - `d4bb15e` – Initial date fixes: added `DatePickerField` component, `date-utils.ts`, and integrated React DatePicker into `DynamicListForm`
   - `e0441ee` – Additional date/time control fixes and styling
   - `2a7a11f` – Further date dropdown improvements
   - `bc30044` – Merge of `feature/date-fixes` into `develop`

2. **Feb 11, 2026** – Commit `8e88186` ("Adding image upload capability with the BLOB store and related infrastructure") **removed** the date picker integration from `DynamicListForm.tsx`:
   - Removed `DatePickerField` import and usage
   - Removed `formatFieldValue` and `parseDateFromInput` imports
   - Removed date/datetime-specific handling in `handleChange` and `handleSubmit`
   - Reverted date/datetime fields to native `<input type="date">` and `<input type="datetime-local">`

3. **Result** – Production showed native browser date inputs instead of the improved React DatePicker popup with better UX, styling, and dark mode support.

---

## Root Cause Analysis

### Primary Cause: Accidental Overwrite During Large Feature Merge

Commit `8e88186` was a **single-author commit** (not a merge) that touched **28 files** with 1,444 insertions and 736 deletions. When editing `DynamicListForm.tsx` as part of the BLOB/image upload work, the date picker integration was removed. Likely scenarios:

1. **Stale branch base** – The `feature/avatar-image-blob` branch may have been created from a commit *before* the date-fixes merge. When changes were made to `DynamicListForm`, the working copy did not include the date picker code.

2. **Copy-paste or partial revert** – An older version of `DynamicListForm` may have been used as reference, overwriting the current version.

3. **Conflict resolution** – If a merge conflict occurred, the wrong version (without date picker) may have been kept.

4. **Scope creep without verification** – A large refactor touched many files; the author may not have been aware that `DynamicListForm` had recently gained date picker functionality.

### Contributing Factors

- **No automated tests** for the date picker integration in list forms
- **No pre-merge checklist** to verify that existing features in modified files are preserved
- **Large, multi-purpose commits** making it harder to review and catch regressions

---

## How to Prevent This in the Future

### 1. **Smaller, Focused Commits and PRs**

- Keep PRs scoped to a single feature or fix
- Avoid touching unrelated files (e.g., `DynamicListForm` in an image upload PR) unless necessary
- If a file must be touched for unrelated reasons, add a note in the PR description

### 2. **Branch Hygiene**

- Rebase or merge `develop` (or `main`) into feature branches **before** making changes to shared components
- Run `git log develop -- components/lists/DynamicListForm.tsx` before editing to see recent changes
- Use `git diff develop -- components/lists/DynamicListForm.tsx` to ensure you're building on the latest version

### 3. **Pre-Merge Verification**

- Before merging, run: `git diff main...HEAD -- <modified-files>` to review what's changing
- For files that have had recent feature work, do a quick manual check that the feature still works
- Consider a "smoke test" checklist for critical paths (e.g., "Can I add/edit a list row with a date field?")

### 4. **Automated Tests**

- Add integration or E2E tests for list forms with date/datetime fields
- Add a unit test that `DynamicListForm` renders `DatePickerField` for date/datetime fields
- Tests would have caught this regression before merge

### 5. **Documentation and Awareness**

- Document which components have custom behavior (e.g., "DynamicListForm uses DatePickerField for date/datetime")
- Add a `CONTRIBUTING.md` or similar with guidance on rebasing and checking for recent changes before editing shared components

### 6. **Code Review Practices**

- Reviewers: when a PR touches a file that recently had feature work, verify that work is still present
- Use `git blame` or `git log -p` on modified files to see recent changes before approving

### 7. **Feature Flags or Modular Components** (Optional)

- Consider extracting date/datetime rendering into a smaller, single-responsibility component that is less likely to be accidentally removed when refactoring

---

## Resolution

The date picker UX has been **restored** by re-integrating `DatePickerField` into `DynamicListForm.tsx`:

- Re-added imports for `DatePickerField`, `formatFieldValue`, and `parseDateFromInput`
- Restored `formatInitialData` for proper date/datetime formatting from `initialData`
- Restored date/datetime handling in `handleChange` (keeping ISO strings in form state)
- Restored date conversion in `handleSubmit` (converting to `Date` for validation and submission)
- Restored conditional rendering of `DatePickerField` for `date` and `datetime` field types

---

## Lessons Learned

1. **Large commits are risky** – They increase the chance of accidentally overwriting or removing unrelated work.
2. **Rebase before you edit** – Ensure your branch includes the latest changes to files you're about to modify.
3. **Tests protect against regressions** – Automated tests would have caught this before merge.
4. **Review with context** – Knowing recent history of modified files helps reviewers spot regressions.
