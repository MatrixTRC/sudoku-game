# sudoku-game
A browser-based Sudoku game for exploring and testing GitHub Copilot workflows.

## Play

Open [index.html](./index.html) directly in your browser. No installation,
server, or internet connection is needed.

- Fill white cells with digits 1-9. Shaded starting numbers are locked.
- Use Tab to move between editable cells and Backspace or Delete to clear a cell.
- **Check Solution** reports **incomplete** if any cell is empty, even if other
  entries are wrong. A full board is reported as **incorrect** or **solved**.
- **Reset** immediately clears your entries and feedback, restoring the fixed puzzle.

Each row, column, and 3-by-3 box must contain the digits 1-9 without repeats.
