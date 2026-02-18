# Plan Review: Conflicts and Inconsistencies Report

## Summary

The original plan contained **6 issues**: 2 terminology errors, 2 missing implementation details, 1 logical conflict, and 1 ambiguous edge case. Below is the detailed report and the revised plan.

---

## 1. Terminology: "Optimistic Updates" Used Incorrectly

**Issue:** The plan labeled the approach as "optimistic updates" but described **server-response updates**.

- **Optimistic updates** = Update UI immediately before the server responds; revert on failure.
- **Server-response updates** = Wait for the API response, then update local state with that response (no full refetch).

**Conflict:** Phase 1 proposes using the API response to merge into state—that is server-response updates, not optimistic. The Risk section then says "consider reverting optimistic update on failure," which only applies to true optimistic updates.

**Resolution:** Use the term "server-response updates" or "local state merge from API response" throughout. Remove the "reverting optimistic update" risk item (not applicable).

---

## 2. Pagination State Not Updated on Add/Delete

**Issue:** When adding or deleting a row without refetching, `pagination.total` becomes incorrect.

- **Add:** `pagination.total` should increase by 1.
- **Delete:** `pagination.total` should decrease by 1.

**Conflict:** The plan says "append API response to local rows" and "remove row from local rows" but never mentions updating `pagination`. The footer ("Showing X to Y of Z rows") would show wrong totals.

**Resolution:** Explicitly update `setPagination` when adding (total + 1) and deleting (total - 1).

---

## 3. New Row Position: Append vs. Sorted Insert

**Issue:** Phase 1.2 says "append" the new row. The default sort is `createdAt desc`, so new rows usually belong at the **top**, not the bottom.

**Conflict:** Appending puts the new row at the bottom of the current page, which is wrong for the common case. The Risk section calls this "acceptable for now" without a clear rule.

**Resolution:** **Prepend** the new row (insert at index 0) when the sort is `createdAt` desc (the default). For other sort fields, document that the row may appear out of order until the next filter/sort change; avoid "append" as the default.

---

## 4. Phase 3 Wording: "optimistic-only"

**Issue:** Phase 3 says: "Per-cell saving indicator (if not using optimistic-only)."

**Conflict:** The plan does not use optimistic updates. The phrase "optimistic-only" is unclear and suggests a mode we are not implementing.

**Resolution:** Rephrase as: "Per-cell saving indicator: show a spinner while the save request is in flight (since we wait for the server response)."

---

## 5. API Response Structure Not Specified

**Issue:** The plan says "merge API response `data`" and "append API response `data`" but does not specify the response shape.

**Conflict:** PUT returns `{ message, data: row }` and POST returns `{ message, data: row }`. The `row` from Prisma includes `listId`, `rowNumber`, `deletedAt`; the component expects `{ id, rowData, createdAt, updatedAt }`. Mapping is implied but not stated.

**Resolution:** Specify that we use `response.data` from the parsed JSON, and that the row shape matches `ListDataRow` (id, rowData, createdAt, updatedAt). Note that Prisma returns extra fields that can be ignored.

---

## 6. Risk Section: "Reverting Optimistic Update"

**Issue:** The Risk section says: "consider reverting optimistic update on failure."

**Conflict:** We are not doing optimistic updates. There is nothing to revert—we only update state after a successful response. On failure, we keep the previous state and show an error.

**Resolution:** Remove this item. Replace with: "On API failure, keep existing state and display error; no revert needed."
