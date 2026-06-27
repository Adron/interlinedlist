---
description: Keep .codex/agents/*.toml in sync with the canonical .claude/agents/*.md
---

The repo mirrors its Claude subagents as Codex agents so both toolchains share the same roles. Keep them in lockstep:

- For each `.claude/agents/<name>.md`, ensure a matching `.codex/agents/<name>.toml` exists and reflects the same role, description, and core instructions.
- Report any agent that exists in one toolchain but not the other (e.g. a new `.claude/agents/*.md` with no `.codex` mirror).
- Mirror only what the markdown actually defines — do not invent capabilities or tools that aren't in the source agent.

End with a short list of what you changed and what (if anything) still needs manual attention.
