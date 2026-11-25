import { test, expect, loadAllTestAccounts } from 'deepspace/testing'
import type { Page } from '@playwright/test'
test.skip(
  loadAllTestAccounts().length < 4,
  'Needs four dedicated accounts for owner/coach/viewer/outsider.',
)
async function action(page: Page, name: string, params: object = {}) {
  return page.evaluate(
    async ({ name, params }) => {
      // @ts-expect-error Vite source modules are available to browser integration tests.
      const { rallyAction } = await import('/src/features/matches/api.ts')
      try {
        return { data: await rallyAction(name, params) }
      } catch (e) {
        return { error: (e as Error).message }
      }
    },
    { name, params },
  )
}
test('owner, coach, viewer and outsider have distinct access; revocation removes open subscriptions', async ({
  users,
}) => {
  test.setTimeout(90000)
  const [owner, coach, viewer, outsider] = await users(4)
  await Promise.all(
    [owner, coach, viewer, outsider].map((u) => u.page.goto('/home')),
  )
  const player = `Collab ${Date.now()}`
  const created = await action(owner.page, 'createMatch', {
    player,
    opponent: 'Jordan',
  })
  const id = created.data.recordId
  const url = `/home?match=${id}`
  await owner.page.goto(url)
  await expect(
    owner.page.getByRole('heading', { name: `${player} vs Jordan` }),
  ).toBeVisible()
  for (const [user, role] of [
    [coach, 'coach'],
    [viewer, 'viewer'],
  ] as const) {
    await owner.page
      .getByLabel('Email address', { exact: true })
      .fill(user.email)
    await owner.page
      .getByLabel('Match role', { exact: true })
      .selectOption(role)
    await owner.page
      .getByRole('button', { name: 'Create invitation', exact: true })
      .click()
    await expect(
      owner.page.getByText('Invitation ready.', { exact: false }),
    ).toBeVisible()
    await user.page
      .getByRole('button', { name: 'Refresh', exact: true })
      .click()
    const invite = user.page.locator('.inbox-item').filter({ hasText: player })
    await invite.getByRole('button', { name: 'Accept invitation' }).click()
    await expect(
      user.page.getByRole('heading', { name: `${player} vs Jordan` }),
    ).toBeVisible()
  }
  await expect(
    coach.page.getByRole('button', { name: 'Save point', exact: true }),
  ).toBeDisabled()
  const court = coach.page.getByRole('button', { name: 'Tennis court:' })
  await court.click({ position: { x: 100, y: 150 } })
  await coach.page
    .getByRole('button', { name: 'Save point', exact: true })
    .click()
  for (const user of [owner, coach, viewer])
    await expect(user.page.locator('.point-history li')).toHaveCount(1)
  await expect(
    viewer.page.getByRole('button', { name: 'Save point', exact: true }),
  ).toBeDisabled()
  expect(
    (
      await action(viewer.page, 'logPoint', {
        matchId: id,
        x: 0.5,
        y: 0.5,
        shotType: 'serve',
        winner: 'player',
        outcome: 'winner',
      })
    ).error,
  ).toContain('access denied')
  expect(
    (
      await action(viewer.page, 'inviteParticipant', {
        matchId: id,
        email: outsider.email,
        role: 'coach',
      })
    ).error,
  ).toContain('access denied')
  expect(
    (await action(viewer.page, 'analyzeMatch', { matchId: id })).error,
  ).toContain('access denied')
  await coach.page
    .getByLabel('New observation')
    .fill('Backhand contact is late under pressure.')
  await coach.page
    .getByRole('button', { name: 'Add observation', exact: true })
    .click()
  await expect(
    viewer.page.getByText('Backhand contact is late under pressure.', {
      exact: true,
    }),
  ).toBeVisible()
  await outsider.page.goto(url)
  await expect(
    outsider.page.getByText('That match is unavailable', { exact: false }),
  ).toBeVisible()
  expect(
    (await action(outsider.page, 'prepareMatch', { matchId: id })).error,
  ).toContain('access denied')
  expect(
    (
      await action(outsider.page, 'removePoint', {
        matchId: id,
        pointId: 'any',
      })
    ).error,
  ).toContain('access denied')
  // Removal is a deliberate correction and updates every viewer.
  owner.page.once('dialog', (dialog) => dialog.accept())
  await owner.page
    .getByRole('button', { name: 'Remove point 1', exact: true })
    .click()
  await expect(viewer.page.locator('.point-history li')).toHaveCount(0)
  // Coach contributes again so revocation covers records created by that coach.
  await court.click({ position: { x: 120, y: 170 } })
  await coach.page
    .getByRole('button', { name: 'Save point', exact: true })
    .click()
  await expect(owner.page.locator('.point-history li')).toHaveCount(1)
  const row = owner.page
    .locator('.participant-list > div')
    .filter({ hasText: coach.email })
  await row.getByRole('button', { name: 'Revoke access' }).click()
  await expect(
    coach.page.getByText('That match is unavailable', { exact: false }),
  ).toBeVisible({ timeout: 15000 })
  await expect(coach.page.locator('.point-history')).toHaveCount(0)
  expect(
    (
      await action(coach.page, 'logPoint', {
        matchId: id,
        x: 0.5,
        y: 0.5,
        shotType: 'serve',
        winner: 'player',
        outcome: 'winner',
      })
    ).error,
  ).toContain('access denied')
  await coach.page.reload()
  await expect(
    coach.page.getByText('That match is unavailable', { exact: false }),
  ).toBeVisible()
  await expect(viewer.page.locator('.point-history li')).toHaveCount(1)
  // Invitations are email-bound, not bearer links; an outsider cannot steal one.
  const pending = await action(owner.page, 'inviteParticipant', {
    matchId: id,
    email: coach.email,
    role: 'viewer',
  })
  expect(
    (
      await action(outsider.page, 'acceptInvitation', {
        invitationId: pending.data.recordId,
      })
    ).error,
  ).toContain('access denied')
  await action(owner.page, 'cancelInvitation', {
    invitationId: pending.data.recordId,
  })
  expect(
    (
      await action(coach.page, 'acceptInvitation', {
        invitationId: pending.data.recordId,
      })
    ).error,
  ).toContain('access denied')
})

test('point retries are idempotent; completed matches reject new points; evidence gate precedes AI billing', async ({
  users,
}) => {
  const [owner] = await users(1)
  await owner.page.goto('/home')
  const id = (
    await action(owner.page, 'createMatch', {
      player: 'Retry test',
      opponent: 'Opponent',
    })
  ).data.recordId
  const point = {
    matchId: id,
    x: 0.4,
    y: 0.3,
    shotType: 'forehand',
    winner: 'player',
    shotBy: 'player',
    outcome: 'winner',
    requestId: crypto.randomUUID(),
  }
  const first = await action(owner.page, 'logPoint', point),
    retry = await action(owner.page, 'logPoint', point)
  expect(first.data.recordId).toBe(retry.data.recordId)
  expect(
    (
      await action(owner.page, 'logPoint', {
        ...point,
        requestId: crypto.randomUUID(),
        winner: 'opponent',
      })
    ).error,
  ).toContain('winner must agree')
  await action(owner.page, 'setMatchStatus', {
    matchId: id,
    status: 'completed',
  })
  expect(
    (
      await action(owner.page, 'logPoint', {
        ...point,
        requestId: crypto.randomUUID(),
      })
    ).error,
  ).toContain('Reopen')
  expect(
    (await action(owner.page, 'analyzeMatch', { matchId: id })).error,
  ).toContain('10 and 500')
})

test('live DeepSpace AI produces persisted evidence-cited advice', async ({
  users,
}) => {
  test.skip(
    process.env.RUN_LIVE_AI !== '1',
    'Opt-in paid provider verification: RUN_LIVE_AI=1',
  )
  test.setTimeout(120000)
  const [owner] = await users(1)
  await owner.page.goto('/home')
  const id = (
    await action(owner.page, 'createMatch', {
      player: 'AI evidence sample',
      opponent: 'Practice opponent',
      details: 'Synthetic test data, not a real match.',
    })
  ).data.recordId
  const createdPoints: string[] = []
  for (let i = 0; i < 12; i++) {
    const result = await action(owner.page, 'logPoint', {
      matchId: id,
      x: 0.3 + (i % 3) * 0.1,
      y: 0.2 + (i % 4) * 0.1,
      shotType: i % 2 ? 'backhand' : 'forehand',
      shotBy: 'player',
      winner: i % 3 ? 'player' : 'opponent',
      outcome: i % 3 ? 'winner' : 'unforced error',
      requestId: crypto.randomUUID(),
    })
    expect(result.error).toBeUndefined()
    createdPoints.push(result.data.recordId)
  }
  await action(owner.page, 'setMatchStatus', {
    matchId: id,
    status: 'completed',
  })
  const result = await action(owner.page, 'analyzeMatch', { matchId: id })
  expect(result.error).toBeUndefined()
  expect(result.data.recordId).toBeTruthy()
  const cached = await action(owner.page, 'analyzeMatch', { matchId: id })
  expect(cached.data.recordId).toBe(result.data.recordId)
  await owner.page.goto(`/home?match=${id}`)
  await expect(owner.page.locator('.recommendations article'))
    .toHaveCount(2)
    .catch(async () => {
      await expect(owner.page.locator('.recommendations article')).toHaveCount(
        3,
      )
    })
  await expect(owner.page.locator('.evidence-grid')).toContainText(
    '8 of 12 (67%)',
  )
  await owner.page.reload()
  await expect(
    owner.page.locator('.recommendations article').first(),
  ).toBeVisible()
  await action(owner.page, 'removePoint', {
    matchId: id,
    pointId: createdPoints[0],
  })
  await expect(
    owner.page.getByText('This saved review is historical', { exact: false }),
  ).toBeVisible()
  expect(
    (await action(owner.page, 'analyzeMatch', { matchId: id })).error,
  ).toContain('Analysis limit reached')
})
