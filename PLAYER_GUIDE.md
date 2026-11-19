# Sudoku Player Guide

## Start playing

Open [index.html](./index.html) in a browser with JavaScript enabled.
No installation or server is needed. You can play offline; saving and viewing
shared results require internet access.

Fill the 9-by-9 board so that every row, column, and 3-by-3 box contains
the digits 1-9 without repeats.

## Enter and change answers

- Select an editable cell and type a digit from 1 to 9. Editable cells
  start white; shaded starting numbers are locked.
- With **Notes: Off**, type another valid digit to replace an answer.
  Press **Backspace** or **Delete** to clear an answer.
- Invalid characters, including 0, leave existing answers and notes unchanged.

## Move between cells

- Select a cell and use the **arrow keys** to move one cell left, right, up,
  or down, including onto locked starting numbers.
- Navigation stops at each board edge: pressing an arrow toward the outside
  keeps you in the same cell without wrapping to another row or column.
- Starting numbers remain locked when reached with arrow keys. You can move
  away from them with the same keys.
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

## Save and view completions

Once every answer is correct, **Save Result** becomes available. Enter a
nickname of 1-40 characters, then click it to share your completion. Your
nickname, puzzle identifier, and completion time will be public, so avoid
personal information. The time records when the server saves your result,
not how long you spent solving.

**Recent completions** shows up to 10 results, newest first. Click
**Refresh results** to load the latest entries or retry a failed load.
Connection errors do not affect your answers, notes, or Undo/Redo history.

While a save is pending, repeated clicks cannot submit another result.
After a successful save, you cannot save the same attempt again, even if you
Undo and Redo an answer. Confirmed Reset starts another attempt; reloading
starts a new local session too.

If saving fails, follow the message beside the button. A network interruption
can leave the outcome uncertain: refresh the list before retrying because your
result may already have been saved. A successful save remains saved even if
loading the updated list fails. Resetting or closing the page cannot cancel a
submission already sent to the server.

## Reset or start over

Click **Reset** and confirm to restore the same starting puzzle. This clears
your answers, notes, Undo and Redo histories, matching highlights, and feedback.
It keeps starting numbers locked and leaves the Notes setting unchanged.

Canceling the confirmation keeps your game and history unchanged.
A confirmed Reset cannot be undone.

Progress is not saved between page loads. Reloading or reopening the page
starts the puzzle again. Results already shared remain in the public list.
