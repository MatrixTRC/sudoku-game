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
  await page.getByRole('button', { name: 'Check Solution', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Incomplete:');

  const dialogPromise = page.waitForEvent('dialog');
  const clickPromise = page.getByRole('button', { name: 'Reset', exact: true }).click();
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe('confirm');
  await dialog.accept();
  await clickPromise;

  expect(await readBoard(page)).toEqual(originalBoard);
  await expect(page.getByRole('status')).toBeEmpty();
});

test('canceling Reset preserves entries, feedback, and locked clues', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Row 1, column 3', exact: true }).fill('1');
  await page.getByRole('textbox', { name: 'Row 1, column 4', exact: true }).fill('6');
  await page.getByRole('button', { name: 'Check Solution', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Incomplete:');
  const before = await readBoard(page);
  const feedback = await page.getByRole('status').textContent();

  const dialogPromise = page.waitForEvent('dialog');
  const clickPromise = page.getByRole('button', { name: 'Reset', exact: true }).click();
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe('confirm');
  await dialog.dismiss();
  await clickPromise;

  expect(await readBoard(page)).toEqual(before);
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
