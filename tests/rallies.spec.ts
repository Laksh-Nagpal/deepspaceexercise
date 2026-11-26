import { test, expect, loadAllTestAccounts } from 'deepspace/testing'
test.skip(loadAllTestAccounts().length < 1, 'Needs a DeepSpace test account.')
test('a complete rally counts once, replays in order, and persists with draft corrections', async ({
  users,
  browser,
}) => {
  const [owner] = await users(1)
  const page = owner.page
  await page.goto('/home')
  await page.getByRole('button', { name: 'New match', exact: true }).click()
  await page.getByLabel('Your player', { exact: true }).fill('Rally player')
  await page.getByLabel('Opponent', { exact: true }).fill('Rally opponent')
  await page.getByRole('button', { name: 'Create match', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Rally player vs Rally opponent' }),
  ).toBeVisible()
  await page.getByRole('switch', { name: 'Quick entry' }).uncheck()
  const url = page.url(),
    court = page.getByRole('button', { name: 'Tennis court:' })
  const append = page.getByRole('button', { name: 'Add shot', exact: true }),
    save = page.getByRole('button', { name: 'Save point', exact: true })
  await court.click({ position: { x: 110, y: 130 } })
  await append.click()
  await expect(
    page.getByLabel('Who hits this shot?', { exact: true }),
  ).toHaveValue('opponent')
  await page.getByRole('button', { name: 'backhand', exact: true }).click()
  await court.click({ position: { x: 160, y: 350 } })
  await append.click()
  await page.getByRole('button', { name: 'forehand', exact: true }).click()
  await court.click({ position: { x: 190, y: 180 } })
  await append.click()
  await expect(page.locator('.draft-shot-list > div')).toHaveCount(3)
  await expect(page.locator('.point-history li')).toHaveCount(0)
  await expect(
    page
      .locator('.stats-row')
      .first()
      .locator('.stat')
      .first()
      .locator('strong'),
  ).toHaveText('0')
  await page.getByRole('button', { name: 'Edit shot 2', exact: true }).click()
  await court.click({ position: { x: 170, y: 320 } })
  await page.getByRole('button', { name: 'volley', exact: true }).click()
  await page.getByRole('button', { name: 'Update shot', exact: true }).click()
  await expect(page.locator('.draft-shot-list > div').nth(1)).toContainText(
    'volley',
  )
  await page
    .getByRole('button', { name: 'Undo last shot', exact: true })
    .click()
  await expect(page.locator('.draft-shot-list > div')).toHaveCount(2)
  await append.click()
  await save.click()
  await expect(page.locator('.point-history li')).toHaveCount(1)
  await expect(page.locator('.point-history li')).toContainText('3-shot rally')
  await expect(
    page
      .locator('.stats-row')
      .first()
      .locator('.stat')
      .first()
      .locator('strong'),
  ).toHaveText('1')
  await expect(
    page.locator('.rally-stats .stat').first().locator('strong'),
  ).toHaveText('3')
  await expect(page.locator('.shot-marker')).toHaveCount(3)
  await expect(page.getByTestId('rally-path')).toBeVisible()
  const positions = await page
    .locator('.shot-marker')
    .evaluateAll((els) =>
      els.map((e) => [e.getAttribute('cx'), e.getAttribute('cy')]),
    )
  await page.getByRole('button', { name: 'Previous shot', exact: true }).click()
  await expect(page.locator('.shot-marker')).toHaveCount(2)
  await page.getByRole('button', { name: 'Next shot', exact: true }).click()
  await expect(page.locator('.shot-marker')).toHaveCount(3)
  await page.reload()
  await page
    .getByRole('button', { name: 'Replay point 1', exact: true })
    .click()
  await expect(page.locator('.replay-controls')).toContainText('Shot 3 of 3')
  await expect(page.locator('.replay-shot-list')).toContainText('volley')
  expect(
    await page
      .locator('.shot-marker')
      .evaluateAll((els) =>
        els.map((e) => [e.getAttribute('cx'), e.getAttribute('cy')]),
      ),
  ).toEqual(positions)
  const fresh = await browser.newContext({
    storageState: await owner.context.storageState(),
  })
  try {
    const other = await fresh.newPage()
    await other.goto(url)
    await expect(other.locator('.point-history li')).toContainText(
      '3-shot rally',
    )
    await expect(
      other.locator('.rally-stats .stat').first().locator('strong'),
    ).toHaveText('3')
  } finally {
    await fresh.close()
  }
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.setViewportSize({ width: 1440, height: 1100 })
  await court.scrollIntoViewIfNeeded()
  await page.screenshot({ path: '/private/tmp/rallyiq-rally-replay.png' })
})
