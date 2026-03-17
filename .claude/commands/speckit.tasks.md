---
description: Generate an actionable, dependency-ordered tasks.md for the feature based on design artifacts.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Load design documents** from the active feature directory in `specs/`:
   - **Required**: plan.md, spec.md
   - **Optional**: data-model.md, contracts/, research.md

2. **Execute task generation**:
   - Extract tech stack and project structure from plan.md
   - Extract user stories with priorities from spec.md
   - Map entities and contracts to user stories
   - Generate tasks organized by user story
   - Use `.specify/templates/tasks-template.md` as structure

3. **Generate tasks.md** with:
   - Phase 1: Setup tasks
   - Phase 2: Foundational (blocking prerequisites)
   - Phase 3+: One phase per user story (priority order)
   - Final Phase: Polish & cross-cutting concerns
   - Dependencies section
   - Parallel execution opportunities

4. **Report**: Total task count, tasks per user story, parallel opportunities, suggested MVP scope.

## Task Format

Every task MUST follow: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- T001, T002, etc. in execution order
- [P] only if parallelizable
- [US1], [US2] etc. for user story phase tasks
- Include exact file paths
