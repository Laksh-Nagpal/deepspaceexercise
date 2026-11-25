import { expect, it, vi } from 'vitest'
import type { ActionContext } from 'deepspace/worker'
import type { Env } from '../../worker'
import { actions } from './index'
it('refuses writes to another player’s match before creating a point', async () => {
  const create = vi.fn()
  const get = vi.fn().mockResolvedValue({
    success: true,
    data: { record: { createdBy: 'other-user' } },
  })
  const context = {
    userId: 'caller',
    params: {
      matchId: 'private',
      x: 0.5,
      y: 0.3,
      shotType: 'serve',
      winner: 'player',
      outcome: 'winner',
    },
    tools: {
      get,
      create,
      query: vi
        .fn()
        .mockResolvedValue({ success: true, data: { records: [] } }),
    },
  } as unknown as ActionContext<Env>
  expect(await actions.logPoint(context)).toMatchObject({ success: false })
  expect(create).not.toHaveBeenCalled()
})
it('rejects malformed point data without reading or writing storage', async () => {
  const get = vi.fn(),
    create = vi.fn()
  expect(
    await actions.logPoint({
      userId: 'caller',
      params: { x: -1 },
      tools: {
        get,
        create,
        query: vi
          .fn()
          .mockResolvedValue({ success: true, data: { records: [] } }),
      },
    } as unknown as ActionContext<Env>),
  ).toMatchObject({ success: false })
  expect(get).not.toHaveBeenCalled()
  expect(create).not.toHaveBeenCalled()
})
