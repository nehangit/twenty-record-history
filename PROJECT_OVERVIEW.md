# Record change history

## Purpose

Show who changed which field on a record, from what value to what value, and when. The history appears in the record's Timeline tab, newest first.

## How it works

Twenty already logs record events in its timeline. This work builds on that instead of adding a new store.

1. When a record is updated, the server computes a per-field diff (`before` / `after`). Updates that change nothing emit no event.
2. A background job writes one `timelineActivity` row per update, holding the diff, the author and the time.
3. The front end reads rows through the standard `timelineActivities` API. Fields the viewer's role cannot read are removed by the server before they reach the browser.
4. The Timeline tab renders each update as `Field: old value -> new value`.

## Key decisions

- Reuse the timeline system, its permissions and its UI.
- Each update of a record is its own history entry. Previously, edits by the same person within 10 minutes were merged, which could show a reverted edit as a change from a value to itself.
- Fields marked as not audit logged never enter the history.

## Usage

Open a person (for example `/object/person/<id>`), click the **Timeline** tab, edit a field, wait a few seconds for the background worker, and reload.

## Status

In progress. See `WORKING_NOTES.md` for details.
