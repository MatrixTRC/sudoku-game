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
