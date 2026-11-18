# Repository instructions

- This is a browser-only Sudoku game. `index.html` contains the markup,
  inline CSS, puzzle data, and vanilla JavaScript game logic.
- Preserve the dependency-free runtime. Run the game by opening
  `index.html` directly; no server or build step is needed.
- Keep starting numbers locked and pencil notes separate from answers.
  Preserve keyboard navigation, matching-number highlights, and reset confirmation.
- Tests live in `tests/sudoku.spec.js`; `playwright.config.js` configures
  Chromium tests that open the HTML file directly.
- Test setup requires Node.js 22 and npm: run `npm ci`, then
  `npx playwright install chromium`.
- Run the existing test suite with `npm test`. Add focused Playwright
  tests for behavior changes and update README play instructions as needed.
