const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const puzzle = [
  '530070000',
  '600195000',
  '098000060',
  '800060003',
  '400803001',
  '700020006',
  '060000280',
  '000419005',
  '000080079',
].join('');

const solution = [
  '534678912',
  '672195348',
  '198342567',
  '859761423',
  '426853791',
  '713924856',
  '961537284',
  '287419635',
  '345286179',
].join('');

const originalBoard = Array.from(puzzle, digit => ({
  value: digit === '0' ? '' : digit,
  readOnly: digit !== '0',
}));

function readBoard(page) {
  return page.getByRole('textbox').evaluateAll(cells =>
    cells.map(cell => ({ value: cell.value, readOnly: cell.readOnly }))
  );
}

async function expectHighlights(page, indexes) {
  const highlighted = page.locator('.matching-number');
  await expect(highlighted).toHaveCount(indexes.length);
  expect(await highlighted.evaluateAll(cells => cells.map(cell => Number(cell.dataset.index))))
    .toEqual(indexes);
}

async function fillSolution(page) {
  const cells = page.getByRole('textbox');
  for (let index = 0; index < puzzle.length; index++) {
    if (puzzle[index] === '0') await cells.nth(index).fill(solution[index]);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href);
});

test('starting numbers stay locked while blank cells are editable', async ({ page }) => {
  await expect(page.getByRole('textbox')).toHaveCount(81);
  expect(await readBoard(page)).toEqual(originalBoard);

  const clue = page.getByRole('textbox', { name: 'Row 1, column 1, starting number 5', exact: true });
  await expect(clue).not.toBeEditable();
  await clue.click();
  await clue.press('9');
  await clue.press('Backspace');
  await expect(clue).toHaveValue('5');
  expect(await readBoard(page)).toEqual(originalBoard);

  const blank = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  await expect(blank).toBeEditable();
  await blank.fill('4');
  await expect(blank).toHaveValue('4');
});

test('arrow keys move to adjacent cells including locked starting numbers', async ({ page }) => {
  const cells = page.getByRole('textbox');
  for (const [source, key, destination] of [
    [2, 'ArrowLeft', 1],
    [1, 'ArrowRight', 2],
    [3, 'ArrowDown', 12],
    [12, 'ArrowUp', 3],
    [40, 'ArrowRight', 41],
    [41, 'ArrowLeft', 40],
    [0, 'ArrowDown', 9],
    [9, 'ArrowUp', 0],
  ]) {
    await cells.nth(source).focus();
    await page.keyboard.press(key);
    await expect(cells.nth(destination)).toBeFocused();
  }
  expect(await readBoard(page)).toEqual(originalBoard);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
});

test('arrow keys stop at every board edge without wrapping or leaving the board', async ({ page }) => {
  const cells = page.getByRole('textbox');
  for (const [index, keys] of [
    [0, ['ArrowLeft', 'ArrowUp']],
    [8, ['ArrowRight', 'ArrowUp']],
    [72, ['ArrowLeft', 'ArrowDown']],
    [80, ['ArrowRight', 'ArrowDown']],
    [27, ['ArrowLeft']],
    [53, ['ArrowRight']],
    [3, ['ArrowUp']],
    [75, ['ArrowDown']],
  ]) {
    await cells.nth(index).focus();
    for (const key of keys) {
      await page.keyboard.press(key);
      await page.keyboard.press(key);
      await expect(cells.nth(index)).toBeFocused();
    }
  }
  expect(await readBoard(page)).toEqual(originalBoard);
});

test('arrow navigation preserves notes, history, feedback, and clue locks while updating matches', async ({ page }) => {
  const cells = page.getByRole('textbox');
  const answer = cells.nth(2);
  const notedCell = cells.nth(3);
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const redo = page.getByRole('button', { name: 'Redo', exact: true });
  const toggle = page.getByRole('button', { name: /^Notes:/ });
  await answer.press('5');
  await toggle.click();
  await notedCell.pressSequentially('49');
  await undo.click();
  await page.getByRole('button', { name: 'Check Solution', exact: true }).click();
  const feedback = await page.getByRole('status').textContent();
  const before = await readBoard(page);

  await notedCell.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(answer).toBeFocused();
  await expectHighlights(page, [0, 2, 14, 71]);
  await page.keyboard.press('ArrowLeft');
  await expect(cells.nth(1)).toBeFocused();
  await expectHighlights(page, [1, 35, 41]);
  await page.keyboard.press('9');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Delete');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(notedCell).toBeFocused();
  await expectHighlights(page, []);
  await expect(notedCell).toHaveAccessibleDescription('Pencil notes: 4');
  expect(await readBoard(page)).toEqual(before);
  await expect(page.getByRole('status')).toHaveText(feedback);
  await expect(toggle).toHaveText('Notes: On');
  await expect(undo).toBeEnabled();
  await expect(redo).toBeEnabled();

  await redo.click();
  await expect(notedCell).toHaveAccessibleDescription('Pencil notes: 4, 9');
  await notedCell.focus();
  await page.keyboard.press('ArrowRight');
  await expect(cells.nth(4)).toBeFocused();
  await page.keyboard.press('9');
  await expect(cells.nth(4)).toHaveValue('7');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('2');
  await expect(cells.nth(5)).toHaveAccessibleDescription('Pencil notes: 2');
  await undo.click();
  await expect(cells.nth(5)).toHaveAccessibleDescription('');
  await toggle.click();
  await notedCell.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('4');
  await expect(answer).toHaveValue('4');
  await page.keyboard.press('Backspace');
  await expect(answer).toHaveValue('');
});

test('answer input ignores invalid digits and letters without losing notes, answers, or undo history', async ({ page }) => {
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const check = page.getByRole('button', { name: 'Check Solution', exact: true });
  await page.getByRole('button', { name: 'Notes: Off', exact: true }).click();
  await cell.pressSequentially('49');
  await page.getByRole('button', { name: 'Notes: On', exact: true }).click();
  await check.click();
  const feedback = await page.getByRole('status').textContent();

  await cell.pressSequentially('x0');
  await expect(cell).toHaveValue('');
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 4, 9');
  await expect(cell.locator('..').locator('.pencil-notes')).toHaveText('49');
  await expect(page.getByRole('status')).toHaveText(feedback);
  await undo.click();
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 4');

  await cell.press('5');
  await check.click();
  await cell.press('ControlOrMeta+A');
  await cell.pressSequentially('x0');
  await expect(cell).toHaveValue('5');
  await expectHighlights(page, [0, 2, 14, 71]);
  await expect(page.getByRole('status')).toHaveText(feedback);
  await undo.click();
  await expect(cell).toHaveValue('');
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 4');
});

test('answer input replaces filled cells at either caret position and records one undo per change', async ({ page }) => {
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await cell.press('4');
  await page.getByRole('button', { name: 'Check Solution', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Incomplete:');
  await cell.press('5');
  await expect(cell).toHaveValue('5');
  await expectHighlights(page, [0, 2, 14, 71]);
  await expect(page.getByRole('status')).toBeEmpty();
  await cell.press('5');
  await cell.press('Home');
  await cell.press('3');
  await expect(cell).toHaveValue('3');
  await expectHighlights(page, [1, 2, 35, 41]);

  await undo.click();
  await expect(cell).toHaveValue('5');
  await undo.click();
  await expect(cell).toHaveValue('4');
  await undo.click();
  await expect(cell).toHaveValue('');
  await expect(undo).toBeDisabled();
});

test('answer input replaces filled cells for text insertion without keydown events', async ({ page }) => {
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await page.getByRole('button', { name: 'Notes: Off', exact: true }).click();
  await cell.pressSequentially('49');
  await page.getByRole('button', { name: 'Notes: On', exact: true }).click();
  await cell.focus();
  await page.keyboard.insertText('5');
  await expect(cell).toHaveValue('5');
  await expect(cell).toHaveAccessibleDescription('');
  await page.keyboard.insertText('6');
  await expect(cell).toHaveValue('6');
  await undo.click();
  await expect(cell).toHaveValue('5');
  await undo.click();
  await expect(cell).toHaveValue('');
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 4, 9');
});

test('Undo restores entered, replaced, and cleared answers without being consumed by other actions', async ({ page }) => {
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  await expect(undo).toBeDisabled();

  await page.getByRole('textbox', { name: 'Row 1, column 1, starting number 5', exact: true }).click();
  const toggle = page.getByRole('button', { name: /^Notes:/ });
  await toggle.click();
  await toggle.click();
  await page.getByRole('button', { name: 'Check Solution', exact: true }).click();
  await expect(undo).toBeDisabled();

  await cell.fill('4');
  await expect(undo).toBeEnabled();
  await cell.fill('6');
  await undo.click();
  await expect(cell).toHaveValue('4');
  await expect(undo).toBeEnabled();

  await cell.fill('');
  await expect(cell).toHaveValue('');
  await undo.click();
  await expect(cell).toHaveValue('4');

  await undo.click();
  await expect(cell).toHaveValue('');
  await expect(undo).toBeDisabled();
  await expect(page.getByRole('status')).toBeEmpty();

  const clue = page.getByRole('textbox', { name: 'Row 1, column 1, starting number 5', exact: true });
  await expect(clue).toHaveValue('5');
  await expect(clue).not.toBeEditable();
  await clue.click();
  await expectHighlights(page, [0, 14, 71]);
  await expect(undo).toBeDisabled();
});

test('Undo restores added, removed, and cleared pencil notes', async ({ page }) => {
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const toggle = page.getByRole('button', { name: 'Notes: Off', exact: true });
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  await toggle.click();
  await cell.press('Backspace');
  await expect(undo).toBeDisabled();

  await cell.pressSequentially('49');
  await undo.click();
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 4');
  await undo.click();
  await expect(cell).toHaveAccessibleDescription('');
  await expect(undo).toBeDisabled();

  await cell.pressSequentially('49');
  await cell.press('4');
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 9');
  await undo.click();
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 4, 9');

  await cell.press('Delete');
  await expect(cell).toHaveAccessibleDescription('');
  await undo.click();
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 4, 9');
});

test('Undoing an answer restores replaced notes and Reset clears undo history', async ({ page }) => {
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const toggle = page.getByRole('button', { name: /^Notes:/ });
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  await toggle.click();
  await cell.pressSequentially('28');
  await toggle.click();
  await cell.fill('4');
  await expect(cell).toHaveValue('4');
  await expect(cell).toHaveAccessibleDescription('');

  await undo.click();
  await expect(cell).toHaveValue('');
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 2, 8');
  await expect(cell.locator('..').locator('.pencil-notes')).toHaveText('28');

  const dialogPromise = page.waitForEvent('dialog');
  const clickPromise = page.getByRole('button', { name: 'Reset', exact: true }).click();
  const dialog = await dialogPromise;
  await dialog.accept();
  await clickPromise;
  await expect(undo).toBeDisabled();
});

test('Redo restores answer edits in order and leaves Undo usable', async ({ page }) => {
  const first = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  const second = page.getByRole('textbox', { name: 'Row 1, column 4', exact: true });
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const redo = page.getByRole('button', { name: 'Redo', exact: true });
  await expect(redo).toBeDisabled();
  await first.pressSequentially('45');
  await second.press('6');
  await second.press('Backspace');
  const edited = await readBoard(page);

  for (let count = 0; count < 4; count++) await undo.click();
  expect(await readBoard(page)).toEqual(originalBoard);
  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();
  await page.getByRole('button', { name: 'Check Solution', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Incomplete:');
  await first.click();
  await redo.click();
  await expect(first).toHaveValue('4');
  await expect(page.getByRole('status')).toBeEmpty();
  await redo.click();
  await expect(first).toHaveValue('5');
  await expectHighlights(page, [0, 2, 14, 71]);
  await redo.click();
  await expect(second).toHaveValue('6');
  await redo.click();
  expect(await readBoard(page)).toEqual(edited);
  await expect(redo).toBeDisabled();
  await undo.click();
  await expect(second).toHaveValue('6');
  await expect(redo).toBeEnabled();
});

test('Redo restores note additions, removals, clearing, and answers that replace notes', async ({ page }) => {
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const redo = page.getByRole('button', { name: 'Redo', exact: true });
  await page.getByRole('button', { name: 'Notes: Off', exact: true }).click();
  await cell.pressSequentially('494');
  await cell.press('Delete');
  for (let count = 0; count < 4; count++) await undo.click();
  for (const description of ['Pencil notes: 4', 'Pencil notes: 4, 9', 'Pencil notes: 9', '']) {
    await redo.click();
    await expect(cell).toHaveValue('');
    await expect(cell).toHaveAccessibleDescription(description);
  }
  await expect(redo).toBeDisabled();

  await undo.click();
  await page.getByRole('button', { name: 'Notes: On', exact: true }).click();
  await cell.press('5');
  await expect(redo).toBeDisabled();
  await undo.click();
  await expect(cell).toHaveValue('');
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 9');
  await redo.click();
  await expect(cell).toHaveValue('5');
  await expect(cell).toHaveAccessibleDescription('');
  await expect(cell.locator('..').locator('.pencil-notes')).toBeEmpty();
  await expect(page.getByRole('button', { name: 'Notes: Off', exact: true })).toBeVisible();
  await undo.click();
  await undo.click();
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 4, 9');
});

test('a new pencil-note edit clears redo history but an empty deletion does not', async ({ page }) => {
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const redo = page.getByRole('button', { name: 'Redo', exact: true });
  await cell.press('4');
  await undo.click();
  await page.getByRole('button', { name: 'Notes: Off', exact: true }).click();
  await cell.press('Delete');
  await expect(redo).toBeEnabled();
  await cell.press('9');
  await expect(redo).toBeDisabled();
  await undo.click();
  await expect(cell).toHaveAccessibleDescription('');
  await redo.click();
  await expect(cell).toHaveValue('');
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 9');
  expect(await readBoard(page)).toEqual(originalBoard);
});

test('non-edit actions and canceling Reset preserve redo history', async ({ page }) => {
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const redo = page.getByRole('button', { name: 'Redo', exact: true });
  const toggle = page.getByRole('button', { name: /^Notes:/ });
  await cell.pressSequentially('45');
  await undo.click();
  const clue = page.getByRole('textbox', { name: 'Row 1, column 1, starting number 5', exact: true });
  await clue.click();
  await clue.press('9');
  await toggle.click();
  await cell.press('9');
  await cell.press('Backspace');
  await toggle.click();
  await cell.pressSequentially('4x0');
  await expect(cell).toHaveValue('4');
  await expect(redo).toBeEnabled();
  await page.getByRole('button', { name: 'Check Solution', exact: true }).click();
  const before = await readBoard(page);
  const feedback = await page.getByRole('status').textContent();

  const dialogPromise = page.waitForEvent('dialog');
  const clickPromise = page.getByRole('button', { name: 'Reset', exact: true }).click();
  const dialog = await dialogPromise;
  await dialog.dismiss();
  await clickPromise;
  expect(await readBoard(page)).toEqual(before);
  await expect(page.getByRole('status')).toHaveText(feedback);
  await expect(undo).toBeEnabled();
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(cell).toHaveValue('5');
  await expect(redo).toBeDisabled();
});

test('confirmed Reset clears undo and redo history without affecting later edits', async ({ page }) => {
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const redo = page.getByRole('button', { name: 'Redo', exact: true });
  await cell.pressSequentially('45');
  await undo.click();
  await expect(undo).toBeEnabled();
  await expect(redo).toBeEnabled();
  const dialogPromise = page.waitForEvent('dialog');
  const clickPromise = page.getByRole('button', { name: 'Reset', exact: true }).click();
  const dialog = await dialogPromise;
  await dialog.accept();
  await clickPromise;
  expect(await readBoard(page)).toEqual(originalBoard);
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  await cell.press('6');
  await undo.click();
  await expect(cell).toHaveValue('');
  await expect(undo).toBeDisabled();
  await redo.click();
  await expect(cell).toHaveValue('6');
  await expect(redo).toBeDisabled();
});

test('confirming Reset clears entries and feedback but preserves locked clues', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Row 1, column 3', exact: true }).fill('4');
  await page.getByRole('textbox', { name: 'Row 1, column 4', exact: true }).fill('6');
  const notedCell = page.getByRole('textbox', { name: 'Row 1, column 6', exact: true });
  await page.getByRole('button', { name: 'Notes: Off', exact: true }).click();
  await notedCell.pressSequentially('28');
  await expect(notedCell).toHaveAccessibleDescription('Pencil notes: 2, 8');
  await page.getByRole('button', { name: 'Check Solution', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Incomplete:');
  await page.getByRole('textbox', { name: 'Row 1, column 1, starting number 5', exact: true }).click();
  await expectHighlights(page, [0, 14, 71]);

  const dialogPromise = page.waitForEvent('dialog');
  const clickPromise = page.getByRole('button', { name: 'Reset', exact: true }).click();
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe('confirm');
  await dialog.accept();
  await clickPromise;

  expect(await readBoard(page)).toEqual(originalBoard);
  await expect(notedCell).toHaveAccessibleDescription('');
  await expect(page.locator('.pencil-notes')).toHaveText(Array(81).fill(''));
  await expectHighlights(page, []);
  await expect(page.getByRole('status')).toBeEmpty();
});

test('canceling Reset preserves entries, feedback, and locked clues', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Row 1, column 3', exact: true }).fill('1');
  await page.getByRole('textbox', { name: 'Row 1, column 4', exact: true }).fill('6');
  const notedCell = page.getByRole('textbox', { name: 'Row 1, column 6', exact: true });
  await page.getByRole('button', { name: 'Notes: Off', exact: true }).click();
  await notedCell.pressSequentially('28');
  await page.getByRole('button', { name: 'Check Solution', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Incomplete:');
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toBeEnabled();
  const before = await readBoard(page);
  const feedback = await page.getByRole('status').textContent();
  await page.getByRole('textbox', { name: 'Row 1, column 1, starting number 5', exact: true }).click();
  await expectHighlights(page, [0, 14, 71]);

  const dialogPromise = page.waitForEvent('dialog');
  const clickPromise = page.getByRole('button', { name: 'Reset', exact: true }).click();
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe('confirm');
  await dialog.dismiss();
  await clickPromise;

  expect(await readBoard(page)).toEqual(before);
  await expect(undo).toBeEnabled();
  await expect(notedCell).toHaveAccessibleDescription('Pencil notes: 2, 8');
  await expect(notedCell.locator('..').locator('.pencil-notes')).toHaveText('28');
  await expectHighlights(page, [0, 14, 71]);
  await expect(page.getByRole('status')).toHaveText(feedback);
});

test('Check Solution reports incomplete before checking wrong entries', async ({ page }) => {
  const check = page.getByRole('button', { name: 'Check Solution', exact: true });
  await check.click();
  await expect(page.getByRole('status')).toContainText('Incomplete:');

  await page.getByRole('textbox', { name: 'Row 1, column 3', exact: true }).fill('1');
  await check.click();
  await expect(page.getByRole('status')).toContainText('Incomplete:');
});

test('Check Solution reports incorrect for a full board with a wrong entry', async ({ page }) => {
  await fillSolution(page);
  await page.getByRole('textbox', { name: 'Row 1, column 3', exact: true }).fill('1');
  await page.getByRole('button', { name: 'Check Solution', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Incorrect:');
});

test('Check Solution reports solved for the correct full board', async ({ page }) => {
  await fillSolution(page);
  await page.getByRole('button', { name: 'Check Solution', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Solved!');
});

test('notes toggle unique candidates without entering an answer', async ({ page }) => {
  const toggle = page.getByRole('button', { name: /^Notes:/ });
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveText('Notes: On');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await cell.pressSequentially('193');
  await expect(cell).toHaveValue('');
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 1, 3, 9');
  await expect(cell.locator('..').locator('.pencil-notes span'))
    .toHaveText(['1', '', '3', '', '', '', '', '', '9']);
  await cell.press('3');
  await cell.pressSequentially('0x');
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 1, 9');
  await toggle.click();
  await expect(toggle).toHaveText('Notes: Off');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(cell).toHaveAccessibleDescription('Pencil notes: 1, 9');
});

test('Backspace and Delete clear notes in notes mode', async ({ page }) => {
  await page.getByRole('button', { name: 'Notes: Off', exact: true }).click();
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  for (const key of ['Backspace', 'Delete']) {
    await cell.pressSequentially('49');
    await expect(cell).toHaveAccessibleDescription('Pencil notes: 4, 9');
    await cell.press(key);
    await expect(cell).toHaveValue('');
    await expect(cell).toHaveAccessibleDescription('');
    await expect(cell.locator('..').locator('.pencil-notes')).toBeEmpty();
  }
});

test('final answers replace notes and remain unchanged in notes mode', async ({ page }) => {
  const toggle = page.getByRole('button', { name: /^Notes:/ });
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  await toggle.click();
  await cell.pressSequentially('49');
  await toggle.click();
  await cell.fill('4');
  await expect(cell).toHaveValue('4');
  await expect(cell).toHaveAccessibleDescription('');
  await expect(cell.locator('..').locator('.pencil-notes')).toBeEmpty();

  await toggle.click();
  await cell.fill('9');
  await cell.press('Backspace');
  await cell.press('Delete');
  await expect(cell).toHaveValue('4');
  await expect(cell).toHaveAccessibleDescription('');

  const clue = page.getByRole('textbox', { name: 'Row 1, column 1, starting number 5', exact: true });
  await clue.click();
  await clue.press('9');
  await clue.press('Backspace');
  await clue.press('Delete');
  await expect(clue).toHaveValue('5');
  await expect(clue).not.toBeEditable();
  await expect(clue).toHaveAccessibleDescription('');
  await expect(clue.locator('..').locator('.pencil-notes')).toBeEmpty();
});

test('notes in the last empty cell do not count as a solved answer', async ({ page }) => {
  await fillSolution(page);
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  await cell.clear();
  await page.getByRole('button', { name: 'Notes: Off', exact: true }).click();
  await cell.press('4');
  await page.getByRole('button', { name: 'Check Solution', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Incomplete:');
  await page.getByRole('button', { name: 'Notes: On', exact: true }).click();
  await cell.fill('4');
  await page.getByRole('button', { name: 'Check Solution', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Solved!');
});

test('selecting starting numbers and answers highlights every matching final value', async ({ page }) => {
  await expectHighlights(page, []);
  const firstAnswer = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  const secondAnswer = page.getByRole('textbox', { name: 'Row 1, column 4', exact: true });
  await firstAnswer.fill('5');
  await secondAnswer.fill('5');
  const before = await readBoard(page);

  const clue = page.getByRole('textbox', { name: 'Row 1, column 1, starting number 5', exact: true });
  await clue.click();
  await expectHighlights(page, [0, 2, 3, 14, 71]);
  await expect(clue).not.toBeEditable();
  await clue.press('9');
  await clue.press('Backspace');
  expect(await readBoard(page)).toEqual(before);
  await expectHighlights(page, [0, 2, 3, 14, 71]);

  await firstAnswer.click();
  await expectHighlights(page, [0, 2, 3, 14, 71]);
  await expect(firstAnswer).toBeFocused();
  await expect(firstAnswer).toHaveCSS('outline-style', 'solid');
  await expect(firstAnswer).toHaveCSS('outline-width', '3px');
  const background = await firstAnswer.evaluate(cell => getComputedStyle(cell).backgroundColor);
  await expect(clue).toHaveCSS('background-color', background);

  await page.getByRole('textbox', { name: 'Row 1, column 2, starting number 3', exact: true }).click();
  await expectHighlights(page, [1, 35, 41]);
  expect(await readBoard(page)).toEqual(before);
});

test('keyboard selection updates matches and empty or notes-only cells clear them', async ({ page }) => {
  const firstAnswer = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  const secondAnswer = page.getByRole('textbox', { name: 'Row 1, column 4', exact: true });
  const notedCell = page.getByRole('textbox', { name: 'Row 1, column 6', exact: true });
  await firstAnswer.fill('5');
  await secondAnswer.fill('3');
  await page.getByRole('button', { name: 'Notes: Off', exact: true }).click();
  await notedCell.pressSequentially('53');
  await page.getByRole('button', { name: 'Notes: On', exact: true }).click();
  const before = await readBoard(page);

  const clue = page.getByRole('textbox', { name: 'Row 1, column 1, starting number 5', exact: true });
  await clue.click();
  await expectHighlights(page, [0, 2, 14, 71]);
  await notedCell.click();
  await expectHighlights(page, []);
  await clue.click();
  await clue.press('Tab');
  await expect(firstAnswer).toBeFocused();
  await expectHighlights(page, [0, 2, 14, 71]);
  await firstAnswer.press('Tab');
  await expect(secondAnswer).toBeFocused();
  await expectHighlights(page, [1, 3, 35, 41]);
  await secondAnswer.press('Tab');
  await expect(notedCell).toBeFocused();
  await expectHighlights(page, []);
  await expect(notedCell).toHaveAccessibleDescription('Pencil notes: 3, 5');
  await notedCell.press('Shift+Tab');
  await expectHighlights(page, [1, 3, 35, 41]);
  await page.getByRole('textbox', { name: 'Row 1, column 7', exact: true }).click();
  await expectHighlights(page, []);
  expect(await readBoard(page)).toEqual(before);
});

test('entering, changing, and clearing the selected answer updates highlights', async ({ page }) => {
  const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
  await cell.click();
  await expectHighlights(page, []);
  await cell.fill('5');
  await expectHighlights(page, [0, 2, 14, 71]);
  await cell.fill('3');
  await expectHighlights(page, [1, 2, 35, 41]);
  await cell.press('Backspace');
  await expectHighlights(page, []);
  await cell.fill('5');
  await expectHighlights(page, [0, 2, 14, 71]);
  await cell.press('Home');
  await cell.press('Delete');
  await expectHighlights(page, []);
});

test.describe('touch selection', () => {
  test.use({ hasTouch: true, viewport: { width: 375, height: 800 } });

  test('tapping starting numbers highlights matches and tapping an empty cell clears them', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Row 1, column 1, starting number 5', exact: true }).tap();
    await expectHighlights(page, [0, 14, 71]);
    await page.getByRole('textbox', { name: 'Row 1, column 2, starting number 3', exact: true }).tap();
    await expectHighlights(page, [1, 35, 41]);
    await page.getByRole('textbox', { name: 'Row 1, column 3', exact: true }).tap();
    await expectHighlights(page, []);
    expect(await readBoard(page)).toEqual(originalBoard);
  });
});

test('cell and enabled button boundaries have sufficient contrast', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Row 1, column 3', exact: true }).fill('4');
  for (const notesMode of [false, true]) {
    if (notesMode) await page.getByRole('button', { name: 'Notes: Off', exact: true }).click();
    await page.mouse.move(0, 0);
    const boundaries = await page.evaluate(() => {
      function luminance(color) {
        const [red, green, blue] = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return red * 0.2126 + green * 0.7152 + blue * 0.0722;
      }
      function contrast(first, second) {
        const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
        return (lighter + 0.05) / (darker + 0.05);
      }
      function background(element) {
        const color = getComputedStyle(element).backgroundColor;
        return color === 'rgba(0, 0, 0, 0)' ? background(element.parentElement) : color;
      }
      const cells = Array.from(document.querySelectorAll('.cell-slot')).filter(slot =>
        parseFloat(getComputedStyle(slot).borderRightWidth) > 0
      ).map(slot => ({
        name: slot.querySelector('input').getAttribute('aria-label'),
        ratio: contrast(getComputedStyle(slot).borderRightColor, background(slot.querySelector('input'))),
      }));
      const buttons = Array.from(document.querySelectorAll('button:not(:disabled)')).map(button => {
        const style = getComputedStyle(button);
        const outside = background(button.parentElement);
        return {
          name: button.textContent,
          ratio: Math.max(contrast(style.borderColor, outside), contrast(style.backgroundColor, outside)),
        };
      });
      return [...cells, ...buttons];
    });
    for (const boundary of boundaries) {
      expect(boundary.ratio, boundary.name).toBeGreaterThanOrEqual(3);
    }
  }
});

for (const width of [320, 481, 768, 801, 1280]) {
  test(`layout fits a ${width}px viewport with usable puzzle controls`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const board = await page.getByRole('group', { name: 'Sudoku board', exact: true }).boundingBox();
    expect(Math.abs(board.width - board.height)).toBeLessThan(1);
    for (const button of await page.getByRole('button').all()) {
      const bounds = await button.boundingBox();
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.y).toBeGreaterThanOrEqual(board.y + board.height);
      const labelLines = await button.evaluate(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getClientRects().length;
      });
      expect(labelLines).toBe(1);
    }
  });
}

for (const width of [375, 1280]) {
  test(`notes fit within cells at a ${width}px viewport without blocking input`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.getByRole('button', { name: 'Notes: Off', exact: true }).click();
    const cell = page.getByRole('textbox', { name: 'Row 1, column 3', exact: true });
    await cell.pressSequentially('123456789');
    const cellBounds = await cell.boundingBox();
    const candidates = cell.locator('..').locator('.pencil-notes span');
    for (const candidate of await candidates.all()) {
      const bounds = await candidate.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(cellBounds.x);
      expect(bounds.y).toBeGreaterThanOrEqual(cellBounds.y);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(cellBounds.x + cellBounds.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(cellBounds.y + cellBounds.height);
    }
    await cell.click();
    await expect(cell).toBeFocused();
    await cell.press('Tab');
    await expect(page.getByRole('textbox', { name: 'Row 1, column 4', exact: true })).toBeFocused();
  });
}
