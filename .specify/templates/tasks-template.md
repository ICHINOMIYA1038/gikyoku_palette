# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize project with dependencies

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T003 Setup database schema and migrations
- [ ] T004 [P] Implement authentication framework

---

## Phase 3: User Story 1 - [Title] (Priority: P1)

**Goal**: [Brief description]

- [ ] T005 [P] [US1] Create model in src/models/
- [ ] T006 [US1] Implement service in src/services/

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup
- **User Stories (Phase 3+)**: Depend on Foundational

## Notes

- [P] tasks = different files, no dependencies
- Commit after each task or logical group
