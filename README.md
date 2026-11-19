# sudoku-game
A browser-based Sudoku game for exploring and testing GitHub Copilot workflows.

## Play

Open [index.html](./index.html) directly in your browser. No installation,
server, or internet connection is needed.

- Fill white cells with digits 1-9. Shaded starting numbers are locked.
- Type another valid digit to replace an answer without clearing it first.
  Invalid characters are ignored without changing existing answers or notes.
- Use Tab to move between editable cells and Backspace or Delete to clear a cell.
- Select an answer or starting number to highlight every occurrence of that
  number. Select an empty or notes-only cell to clear highlights; pencil notes
  are not included in matches.
- Toggle **Notes: On** to record possible digits in empty white cells. Type 1-9
  to add or remove a candidate; Backspace or Delete clears the cell's notes.
  Filled cells and starting numbers stay unchanged in notes mode.
- Toggle **Notes: Off** to enter final answers. Entering an answer clears that
  cell's notes. Notes alone do not count as an answer when checking the solution.
- **Undo** reverses the most recent answer or pencil-note change, including
  restoring notes replaced by an answer. It is disabled when there is nothing
  to undo; selecting cells, changing modes, and checking the solution do not
  affect undo history.
- **Redo** restores the latest change reversed by Undo, including answers and
  pencil notes. It is disabled when there is nothing to redo. A new answer or
  note change clears redo history; invalid input and other no-op actions do not.
- **Check Solution** reports **incomplete** if any cell is empty, even if other
  entries are wrong. A full board is reported as **incorrect** or **solved**.
- **Reset** asks for confirmation before clearing your entries, notes, and
  feedback and both history stacks, restoring the fixed puzzle. Cancel keeps
  them unchanged.

Each row, column, and 3-by-3 box must contain the digits 1-9 without repeats.

## Run automated tests

Testing requires Node.js 22 and npm. The game itself still needs only a browser.
From the repository directory, run:

```sh
npm ci
npx playwright install chromium
npm test
```

On Linux, install Chromium's system dependencies too by using
`npx playwright install --with-deps chromium` instead of the browser-only install
command. Browser installation is needed on initial setup and after Playwright
updates that change its browser version.

The Playwright suite opens the HTML file directly in Chromium, without a server.
It covers locked starting numbers, answer and pencil-note undo/redo, matching-number
highlights, confirming and canceling Reset, and incomplete (including partially
incorrect boards), incorrect, and solved results.

GitHub Actions runs the same tests on every pull request.
