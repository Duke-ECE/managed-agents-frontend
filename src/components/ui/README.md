# UI components

This directory holds the app-owned shadcn/ui primitives. Add new primitives
with the shadcn CLI from the frontend repo, then map their colors to the
semantic tokens in `src/index.css`. Keep product behavior in feature pages.

- Use `Button`, `Badge`, `Input`, `Textarea`, `NativeSelect`, `Table`, `Dialog`,
  and `Sheet` before adding page-specific controls.
- Use `ink-*` and semantic status colors from `src/index.css` so both themes
  stay readable. Do not hard-code a dark-only surface in console pages.
- Keep table actions and status badges on one line. Give dense tables a minimum
  width and let their container scroll horizontally on narrow screens.
- Dialogs and sheets use Radix focus management; keep their title and
  description accessible when adapting them.
