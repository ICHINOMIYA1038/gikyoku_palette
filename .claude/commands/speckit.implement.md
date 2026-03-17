---
description: Execute the implementation plan by processing all tasks defined in tasks.md
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Load tasks.md, plan.md, and other design documents from the active feature directory in `specs/`.

2. **Project Setup**: Create/verify .gitignore and other ignore files based on tech stack.

3. Parse tasks.md and extract phases, dependencies, and execution order.

4. **Execute implementation phase-by-phase**:
   - Complete each phase before moving to next
   - Respect dependencies: sequential tasks in order, parallel [P] tasks together
   - Validate each phase completion before proceeding

5. **Progress tracking**:
   - Report progress after each completed task
   - Mark completed tasks as [X] in tasks.md
   - Halt on non-parallel task failures
   - Provide clear error messages

6. **Completion validation**:
   - Verify all tasks completed
   - Check implementation matches specification
   - Report final status summary
