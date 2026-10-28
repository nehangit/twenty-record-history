# Working notes: record change history

Branch: `feat/record-change-history`, cut from `a4162f8b99` (pre-pull commit; the running dev stack matches it). Rebase onto `main` later after rebuilding `twenty-shared` and running `npx nx run twenty-server:command upgrade`.

## Requirements (from the brief)

1. Capture field-level changes on update: field, previous value, new value, time.
2. Expose via an existing backend interface.
3. Readable history section on the record detail page, newest first.
4. No misleading entry for a no-op update; hide private/restricted fields.
5. Focused tests plus a demonstrated update in the UI.

## Decisions (approved by user)

- Extend the existing timeline system (`timelineActivity`), no parallel history store.
- UI: show `before -> after` in the existing Timeline tab update rows.
- Merge: stop merging a record's own `updated` entries (option b). Linked entries keep merging.
- Demo record type: People.
- Verification: unit + server integration tests, user's manual UI check. A Playwright e2e spec is low priority.
- No Playwright MCP browser driving by Claude.

## What already existed

- Capture: `objectRecordChangedValues` (`engine/core-modules/event-emitter/utils/object-record-changed-values.ts`) builds `{ field: { before, after } }`. Update events with no changed fields are not emitted (`format-twenty-orm-event-to-database-batch-event.util.ts`).
- Write: `UpsertTimelineActivityFromInternalEvent` job -> `TimelineActivityService.upsertEvents` -> `TimelineActivityRepository.upsertTimelineActivities`. Non audit logged fields (`isAuditLogged: false`) are stripped before writing; an update whose diff is empty after stripping writes nothing.
- Read: auto-generated `timelineActivities` GraphQL/REST query. `ApplyTimelineActivitiesVisibilityRestrictionsService` strips diff keys the role cannot read; the front also drops diff keys for unreadable fields (`filterOutInvalidTimelineActivities`).
- UI: Timeline tab (`twenty-front/src/modules/activities/timeline-activities`), ordered by `happensAt` desc.

## Gaps found

1. UI showed only `Field -> new value`; previous value hidden.
2. Repository merged same author + record + type rows created within 10 minutes via `objectRecordDiffMerge`. A->B then B->A produced a stored `A -> A` diff (a misleading no-op).
3. A merged row kept the first edit's `happensAt` while showing the last edit's values.

Option (b) removes gaps 2 and 3 for a record's own updates.

## Implementation

Server
- `timeline-activity.repository.ts`: `isRecordOwnUpdate` (snapshot action `updated`, no `linkedRecordId`) payloads skip merge matching and are inserted. Linked payloads still merge.
- Unit: `timeline-activity.repository.spec.ts` new test reproduced the bug (stored `Engineer -> Engineer`) before the fix. The snapshot-stamping merge test now uses a linked payload so merge coverage stays.
- Integration (`timeline-activity-write-path.integration-spec.ts`): batch test now expects one row per update; new person tests for a reverted edit (two rows, increasing `happensAt`) and a no-op update (no new row). Written, NOT yet run (see blockers).

Front
- `EventFieldDiff.tsx`: renders `Label  before -> after` through a local `EventFieldDiffSideValue` (empty check + `EventFieldDiffValueEffect` + `EventFieldDiffValue`). Before side uses record store id `<eventId>--<fieldId>--before`.
- `EventRelationFieldDiffValues.tsx`: opt-in `isBeforeValueShown` renders both names inline; default unchanged for the log console. Uses a render helper, not a component, because `Tooltip` needs a DOM child.
- `filterOutInvalidTimelineActivities.ts`: drops diff entries with `before` deep-equal to `after` (legacy merged rows and still-merging linked rows).
- Tests: `EventFieldDiff.test.tsx` (new), relation `isBeforeValueShown` cases, filter no-op case.

## Progress

- [x] Repository: skip merge for record own `updated` payloads (+ unit tests)
- [x] Integration tests written (not run)
- [x] Front: before -> after in update rows (+ tests)
- [x] Typecheck (tsgo, server + front): clean
- [x] oxlint + oxfmt on changed files: clean
- [x] Unit tests: server timeline + event-emitter 107/107, front timeline + log-console 108/108
- [ ] Adversarial review subagent (running)
- [ ] Integration tests run (blocked)
- [ ] Playwright e2e spec (low priority)

## Blockers

- Integration tests use DB `test` (separate from dev `default`) but share Redis `localhost:6379` and the seeded workspace ids with the dev stack. Running them while the dev stack is up risks the dev worker consuming test jobs and cache collisions. Needs user decision.

## Known tradeoffs / open issues

- Without merging, a queue retry of a partially committed batch could insert a duplicate update row (previously absorbed by merging). Rare.
- More rows for frequent edits (every save is one entry).
- `lint:diff-with-main` diffs against local `main`, which is ahead of this branch; linted changed files directly instead.
