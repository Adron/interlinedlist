# lib/lists — Dynamic Lists DSL

Lists have user-defined schemas described by a DSL (`dsl-*.ts` here; docs/examples in `DSL/`).

Flow: `validateDSLSchema` → `parseDSLSchema` turns the DSL into `ListProperty` rows → `dsl-validator.ts` drives form rendering, conditional field visibility (**9 operators**), and row validation. A list's schema is stored as properties; row data is **JSONB** in `ListDataRow.rowData`.

Lists also support: parent/child hierarchy (circular-ref checked), soft deletes (`deletedAt`), public/private, watcher/collaborator/manager roles (`ListWatcher`), and a `source: "github"` mode backed by `ListGitHubIssueCache`.

This is the most complex pure-logic surface in the repo. Add Vitest cases alongside any change — malformed schemas, circular parent/child refs, and operator combinations are the high-value edge cases. Run `npx vitest run lib/lists/...`.
