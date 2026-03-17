---
description: Perform cross-artifact consistency analysis across spec.md, plan.md, and tasks.md.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Identify inconsistencies, duplications, ambiguities across spec.md, plan.md, and tasks.md. **STRICTLY READ-ONLY** - do not modify any files.

## Execution Steps

1. Load spec.md, plan.md, tasks.md, and constitution.md from the active feature directory.

2. Build semantic models: requirements inventory, user story inventory, task coverage mapping.

3. Detection passes:
   - **Duplication**: Near-duplicate requirements
   - **Ambiguity**: Vague terms lacking measurable criteria
   - **Underspecification**: Missing outcomes or acceptance criteria
   - **Constitution Alignment**: Conflicts with MUST principles
   - **Coverage Gaps**: Requirements with no tasks, tasks with no requirements
   - **Inconsistency**: Terminology drift, conflicting requirements

4. Severity: CRITICAL > HIGH > MEDIUM > LOW

5. Output Markdown analysis report with findings table, coverage summary, and next actions.

6. Offer remediation suggestions (do NOT apply automatically).
