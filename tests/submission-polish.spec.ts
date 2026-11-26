import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

test('the public demo replays fictional rallies without authentication or private data requests', async ({
  page,
}) => {
  const privateRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/'))
      privateRequests.push(request.url())
  })
  const sockets: string[] = []
  page.on('websocket', (socket) => {
    // Vite's development HMR socket is separate from the app data plane.
    if (new URL(socket.url()).pathname.startsWith('/ws/'))
      sockets.push(socket.url())
  })
  await page.goto('/')
  await page.getByRole('link', { name: 'Explore the public demo' }).click()
  await expect(page.getByTestId('public-demo')).toBeVisible()
  await expect(
    page.getByText('NO ACCOUNT REQUIRED', { exact: false }),
  ).toBeVisible()
  await expect(page.locator('.shot-marker')).toHaveCount(3)
  await page
    .getByRole('button', { name: 'Point 2', exact: false })
    .first()
    .click()
  await expect(
    page.getByRole('heading', { name: 'Point 2 replay' }),
  ).toBeVisible()
  await expect(page.locator('.shot-marker')).toHaveCount(5)
  await page.getByRole('button', { name: 'Previous shot' }).click()
  await expect(page.locator('.shot-marker')).toHaveCount(4)
  await page.getByRole('button', { name: 'Next shot' }).click()
  await expect(page.locator('.shot-marker')).toHaveCount(5)
  await expect(page.getByRole('button', { name: 'Save point' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Print sample report' }).click()
  await expect(page.getByTestId('match-report')).toContainText(
    'PUBLIC SYNTHETIC DEMO',
  )
  await expect(page.locator('.report-warning')).toHaveCount(0)
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printed = 'yes'
    }
  })
  await page.getByRole('button', { name: 'Print / Save as PDF' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes')
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.report-toolbar')).toBeHidden()
  await page.pdf({
    path: '/private/tmp/rallyiq-demo-report.pdf',
    format: 'A4',
    printBackground: true,
  })
  expect(privateRequests).toEqual([])
  expect(sockets).toEqual([])
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ media: 'screen' })
  await page.goto('/demo')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: '/private/tmp/rallyiq-public-demo-mobile.png',
    fullPage: true,
  })
})

test('mobile quick entry alternates hitters, corrects taps, saves once and exports an authorized report', async ({
  users,
  browser,
}) => {
  test.skip(loadAllTestAccounts().length < 1, 'Needs a DeepSpace test account.')
  const [owner] = await users(1)
  const context = await browser.newContext({
    storageState: await owner.context.storageState(),
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  })
  try {
    const page = await context.newPage()
    await page.goto('/home')
    await page.getByRole('button', { name: 'New match', exact: true }).click()
    await page
      .getByLabel('Your player', { exact: true })
      .fill('Quick-entry player')
    await page.getByLabel('Opponent', { exact: true }).fill('Touch opponent')
    await page
      .getByRole('button', { name: 'Create match', exact: true })
      .click()
    await expect(
      page.getByRole('heading', {
        name: 'Quick-entry player vs Touch opponent',
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('switch', { name: 'Quick entry' }),
    ).toBeChecked()
    const court = page.getByRole('button', { name: 'Tennis court:' })
    const tap = async (x: number, y: number) => {
      await court.scrollIntoViewIfNeeded()
      const bounds = await court.boundingBox()
      expect(bounds).toBeTruthy()
      await court.tap({
        position: { x: bounds!.width * x, y: bounds!.height * y },
      })
    }
    await tap(0.4, 0.3)
    await expect(page.locator('.draft-shot-list > div')).toHaveCount(1)
    await expect(
      page.getByLabel('Who hits this shot?', { exact: true }),
    ).toHaveValue('opponent')
    await page.getByRole('button', { name: 'backhand', exact: true }).tap()
    await tap(0.6, 0.7)
    await expect(page.locator('.draft-shot-list > div')).toHaveCount(2)
    await page
      .getByRole('button', { name: 'Undo last shot', exact: true })
      .tap()
    await expect(
      page.getByLabel('Who hits this shot?', { exact: true }),
    ).toHaveValue('opponent')
    await tap(0.5, 0.65)
    await page.getByRole('button', { name: 'forehand', exact: true }).tap()
    await tap(0.7, 0.25)
    await expect(page.locator('.draft-shot-list > div')).toHaveCount(3)
    await expect(page.locator('.point-history li')).toHaveCount(0)
    await page.getByRole('button', { name: 'Finish point', exact: true }).tap()
    const dialog = page.getByRole('dialog', {
      name: 'Finish point',
      exact: true,
    })
    await expect(dialog).toBeVisible()
    await dialog
      .getByLabel('How did the point end?')
      .selectOption('unforced error')
    await expect(dialog.locator('.point-winner')).toContainText(
      'Touch opponent',
    )
    await dialog.getByRole('button', { name: 'Save point', exact: true }).tap()
    await expect(dialog).toBeHidden()
    await expect(page.locator('.point-history li')).toHaveCount(1)
    await expect(page.locator('.point-history li')).toContainText(
      '3-shot rally',
    )
    await page.reload()
    await expect(page.locator('.point-history li')).toHaveCount(1)
    await page.getByRole('link', { name: 'Print match report' }).click()
    await expect(page.getByTestId('match-report')).toContainText(
      'Quick-entry player vs Touch opponent',
    )
    await expect(page.locator('.report-metrics > div').first()).toContainText(
      '1',
    )
    await expect(page.locator('.report-metrics > div').nth(3)).toContainText(
      '3',
    )
    await expect(page.locator('.report-metrics > div').nth(2)).toContainText(
      '1',
    )
    await page.emulateMedia({ media: 'print' })
    await expect(page.getByTestId('app-navigation')).toBeHidden()
    await page.pdf({
      path: '/private/tmp/rallyiq-private-report.pdf',
      format: 'A4',
      printBackground: true,
    })
    const publicContext = await browser.newContext()
    try {
      const anonymous = await publicContext.newPage()
      await anonymous.goto(page.url())
      await expect(anonymous.getByTestId('match-report')).toHaveCount(0)
      await expect(
        anonymous.getByText('Quick-entry player vs Touch opponent'),
      ).toHaveCount(0)
    } finally {
      await publicContext.close()
    }
  } finally {
    await context.close()
  }
})
