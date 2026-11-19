# Sudoku Player Guide

## Start playing

Open [index.html](./index.html) in a browser with JavaScript enabled.
No installation, server, or internet connection is needed.

Fill the 9-by-9 board so that every row, column, and 3-by-3 box contains
the digits 1-9 without repeats.

## Enter and change answers

- Select an editable cell and type a digit from 1 to 9. Editable cells
  start white; shaded starting numbers are locked.
- With **Notes: Off**, type another valid digit to replace an answer.
  Press **Backspace** or **Delete** to clear an answer.
- Invalid characters, including 0, leave existing answers and notes unchanged.
- Use **Tab** to move forward through editable cells and the controls, or
  **Shift+Tab** to move backward. Starting numbers are skipped in the tab order,
  but you can click or tap them to highlight matching numbers.

## Record pencil notes

1. Click **Notes: Off** to turn notes on. The button changes to **Notes: On**.
2. Select an empty editable cell and type possible digits. For example,
   typing 4 and then 9 records both candidates in the cell.
3. Type a candidate again to remove it. Press **Backspace** or **Delete**
   to clear all notes in that cell.
4. Click **Notes: On** to turn notes off before entering a final answer.
   Entering an answer removes that cell's notes.

Notes mode does not change filled answers or locked starting numbers.
Pencil notes do not count as answers when checking your solution.

## Highlight matching numbers

Select an answer or starting number to highlight every matching number on
the board. Selecting an empty cell or a cell containing only notes clears
the highlights. Pencil notes are not highlighted as matches.

Highlights help you scan the board; they do not indicate whether an answer
is correct.

## Undo and redo changes

**Undo** reverses the most recent answer or pencil-note change. If an answer
replaced notes, Undo restores those notes. You can undo multiple changes.

**Redo** restores the latest change reversed by Undo. You can redo multiple
changes until there are none left. Both buttons are disabled when their
respective histories are empty.

A new answer or note change clears redo history. Selecting cells, toggling
Notes, checking the solution, invalid input, and other actions that do not
change an answer or notes do not discard history. Undo and Redo leave the
current Notes setting unchanged.

## Check your solution

Click **Check Solution** to see one of three results:

- **Incomplete:** at least one cell still needs an answer, even if other
  entries are wrong or the remaining cells contain notes.
- **Incorrect:** every cell has an answer, but the board contains mistakes.
- **Solved:** every number matches the solution.

You can keep editing after checking.

## Reset or start over

Click **Reset** and confirm to restore the same starting puzzle. This clears
your answers, notes, Undo and Redo histories, matching highlights, and feedback.
It keeps starting numbers locked and leaves the Notes setting unchanged.

Canceling the confirmation keeps your game and history unchanged.
A confirmed Reset cannot be undone.

Progress is not saved between page loads. Reloading or reopening the page
starts the puzzle again.
