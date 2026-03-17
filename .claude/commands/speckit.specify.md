---
description: Create or update the feature specification from a natural language feature description.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Generate a concise short name** (2-4 words) for the feature branch from the description.

2. **Create feature directory**: Create `specs/[###-feature-name]/` directory with the next available number.

3. Load `.specify/templates/spec-template.md` to understand required sections.

4. Follow this execution flow:
   1. Parse user description from Input. If empty: ERROR "No feature description provided"
   2. Extract key concepts: actors, actions, data, constraints
   3. For unclear aspects: Make informed guesses, limit [NEEDS CLARIFICATION] to max 3
   4. Fill User Scenarios & Testing section
   5. Generate Functional Requirements (each must be testable)
   6. Define Success Criteria (measurable, technology-agnostic)
   7. Identify Key Entities (if data involved)

5. Write the specification to `specs/[###-feature-name]/spec.md`.

6. Report completion with spec file path and readiness for `/speckit.plan`.

## Quick Guidelines

- Focus on **WHAT** users need and **WHY**.
- Avoid HOW to implement (no tech stack, APIs, code structure).
- Written for business stakeholders, not developers.
