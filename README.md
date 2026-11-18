# sudoku-game
A browser-based Sudoku game for exploring and testing GitHub Copilot workflows.

## Play

Open [index.html](./index.html) directly in your browser. No installation,
server, or internet connection is needed.

- Fill white cells with digits 1-9. Shaded starting numbers are locked.
- Use Tab to move between editable cells and Backspace or Delete to clear a cell.
- **Check Solution** reports **incomplete** if any cell is empty, even if other
  entries are wrong. A full board is reported as **incorrect** or **solved**.
- **Reset** asks for confirmation before clearing your entries and feedback,
  restoring the fixed puzzle. Cancel keeps your entries and feedback unchanged.

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
It covers locked starting numbers, confirming and canceling Reset, and
incomplete (including partially incorrect boards), incorrect, and solved results.

GitHub Actions runs the same tests on every push and pull request.
