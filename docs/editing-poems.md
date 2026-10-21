# Edit a poem where you read it

On a poem page, press **⌥⌘E** (Ctrl+Alt+E elsewhere). The first time, the
browser asks for the owner's name and password; then the words, and the title
when the poem shows one, become editable where they are. The caret is the only
sign: no outline, no border. Nothing on the page says editing exists until then.

- **Enter** adds a line; **Tab** inserts indentation. **Shift Tab** leaves the
  text with the keyboard.
- **⌘B** / **⌘I** (Ctrl+B / Ctrl+I) make selected words bold or italic. Pasted
  text keeps its characters and spacing, without importing formatting from
  another app.
- **⌘Z** / **⇧⌘Z** undo and redo typing while you edit.
- **⌥⌘E** again saves what changed and leaves editing without a word: the caret
  goes, and that is the only sign. With nothing changed it simply leaves.
- **⌘S** saves and keeps you editing, from the saved words on; with nothing changed it
  does nothing. **Esc** discards this session's changes and leaves.
- After leaving, **⌘Z** / **⇧⌘Z** reverse saved changes made during that visit.

If a save fails, editing stays open and your words stay on the page, with a line
saying why. If another tab saved first, the page keeps your unsaved version and
offers **Load saved version**; copy any lines you want to keep first. Where
saving is not connected, editing says so when it opens, and leaving restores the
words as they were.

Site edits are saved separately from Notion. They do not rewrite the original
Notion draft, source links, attribution, or import snapshots. Readers see the saved
site version; when you open editing, the page warns you if the imported source has
changed since you made site edits.

Editing exists where the owner's credentials are configured: `POEM_EDIT_USER`
and `POEM_EDIT_PASSWORD` in `.env` for `http://127.0.0.1:5211`, and in the Vercel
project's Preview environment variables for the protected hosted preview, which
also saves durably through its private storage connection. The public production
site has no editing until a store and a release are approved.

[Storage and access details](inline-storage.md) · [Shared editor source](shared-inline-edit.md)
