---
description: Execute the implementation planning workflow to generate design artifacts from the feature spec.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Load context**: Find the active feature spec in `specs/*/spec.md`. Read the spec and `.specify/memory/constitution.md`. Load `.specify/templates/plan-template.md`.

2. **Execute plan workflow**:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section from constitution
   - Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate data-model.md, contracts/

3. **Write plan**: Save to `specs/[###-feature-name]/plan.md`.

4. **Report**: Output plan path and generated artifacts.

## Phases

### Phase 0: Outline & Research

1. Extract unknowns from Technical Context
2. Research each unknown and consolidate findings in `research.md`
   - Decision, Rationale, Alternatives considered

### Phase 1: Design & Contracts

1. Extract entities from feature spec → `data-model.md`
2. Define interface contracts → `contracts/`
3. Generate quickstart.md

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
