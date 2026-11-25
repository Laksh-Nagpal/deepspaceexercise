import { test, expect, loadAllTestAccounts } from 'deepspace/testing'
test.skip(
  loadAllTestAccounts().length < 2,
  'Requires two DeepSpace test accounts.',
)

test('create, log, synchronize, refresh and reopen a private match', async ({
  users,
  browser,
}) => {
  const [owner, outsider] = await users(2)
  const page = owner.page
  const player = `Alex ${Date.now()}`
  await page.goto('/home')
  await page.getByRole('button', { name: 'New match', exact: true }).click()
  await page.getByLabel('Your player', { exact: true }).fill(player)
  await page.getByLabel('Opponent', { exact: true }).fill('Jordan')
  await page.getByLabel('Opponent / match notes').fill('Left-handed opponent')
  await page.getByRole('button', { name: 'Create match', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: `${player} vs Jordan` }),
  ).toBeVisible()
  const url = page.url()
  const matchId = new URL(url).searchParams.get('match')!
  await expect(
    page.getByRole('button', { name: 'Save point', exact: true }),
  ).toBeDisabled()
  const court = page.getByRole('button', { name: 'Tennis court:' })
  await court.click({ position: { x: 110, y: 150 } })
  await page.getByRole('button', { name: 'Add shot', exact: true }).click()
  await page.getByRole('button', { name: 'Save point', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Point saved')
  await expect(page.locator('.point-history li')).toHaveCount(1)
  // A second same-account page receives RecordRoom broadcasts, without refresh.
  const second = await owner.context.newPage()
  await second.goto(url)
  await expect(second.locator('.point-history li')).toHaveCount(1)
  await court.focus()
  await court.press('ArrowRight')
  await page.getByRole('button', { name: 'backhand', exact: true }).click()
  await page.getByRole('button', { name: 'Add shot', exact: true }).click()
  await page.getByLabel('How did the point end?').selectOption('unforced error')
  await page.getByRole('button', { name: 'Save point', exact: true }).click()
  await expect(second.locator('.point-history li')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.point-history li')).toHaveCount(2)
  await expect(page.locator('.stats-row').first()).toContainText('50%')
  await page.goto('/home')
  await page.locator('.match-item').filter({ hasText: player }).click()
  await expect(page.locator('.point-history li')).toHaveCount(2)
  // A new browser context tests persisted server records, rather than a local UI cache.
  const fresh = await browser.newContext({
    storageState: await owner.context.storageState(),
  })
  const reopened = await fresh.newPage()
  await reopened.goto(url)
  await expect(reopened.locator('.point-history li')).toHaveCount(2)
  await fresh.close()
  await second.close()
  await outsider.page.goto(url)
  await expect(
    outsider.page.getByText('That match is unavailable', { exact: false }),
  ).toBeVisible()
  const denied = await outsider.page.evaluate(async (id) => {
    // Same authenticated wrapper the UI uses; verifies the action ownership check.
    // @ts-expect-error Vite serves local source modules in the test runtime.
    const { matchAction } = await import('/src/features/matches/api.ts')
    try {
      await matchAction('logPoint', {
        matchId: id,
        x: 0.5,
        y: 0.5,
        shotType: 'serve',
        winner: 'player',
        outcome: 'winner',
      })
      return ''
    } catch (error) {
      return (error as Error).message
    }
  }, matchId)
  expect(denied).toContain('access denied')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: '/private/tmp/rallyiq-mobile.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.screenshot({
    path: '/private/tmp/rallyiq-desktop.png',
    fullPage: true,
  })
})

test('anonymous callers cannot create a match', async ({ request }) => {
  const response = await request.post('/api/actions/createMatch', {
    data: { player: 'A', opponent: 'B' },
  })
  expect(response.status()).toBe(401)
})
