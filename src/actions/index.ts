import { z } from 'zod'
import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import {
  matchInput,
  pointInput,
  hitter,
  type Point,
} from '../features/matches/model'
import { access, denied } from './access'
import { collaborationActions } from './collaboration'
import { analyzeMatch } from './analysis'
const id = z.string().min(1).max(200)
export const actions: Record<string, ActionHandler<Env>> = {
  ...collaborationActions,
  analyzeMatch,
  async createMatch({ params, tools }) {
    const input = matchInput.safeParse(params)
    if (!input.success)
      return { success: false, error: input.error.issues[0].message }
    const recordId = crypto.randomUUID()
    return tools.create(
      'matches',
      { ...input.data, teamId: recordId, status: 'tracking' },
      recordId,
    )
  },
  async createSampleMatch(ctx) {
    const recordId = crypto.randomUUID()
    const created = await ctx.tools.create(
      'matches',
      {
        player: 'Alex (sample)',
        opponent: 'Jordan (sample)',
        details:
          'Synthetic practice data for exploring RallyIQ. Not a real match.',
        teamId: recordId,
        status: 'tracking',
      },
      recordId,
    )
    if (!created.success) return created
    for (let i = 0; i < 12; i++) {
      const result = await ctx.tools.create('points', {
        matchId: recordId,
        ownerId: ctx.userId,
        shotBy: 'player',
        shotType: i % 2 ? 'backhand' : 'forehand',
        winner: i % 3 ? 'player' : 'opponent',
        outcome: i % 3 ? 'winner' : 'unforced error',
        x: 0.3 + (i % 3) * 0.1,
        y: 0.2 + (i % 4) * 0.1,
      })
      if (!result.success) return result
    }
    const finished = await ctx.tools.update('matches', recordId, {
      status: 'completed',
    })
    return finished.success ? created : finished
  },
  async prepareMatch(ctx) {
    const matchId = id.safeParse(ctx.params.matchId)
    if (!matchId.success) return denied
    const grant = await access(ctx, matchId.data)
    if (!grant) return denied
    // Additive Phase 1 compatibility. No resets or destructive schema migration.
    if (grant.role === 'owner' && !grant.data.teamId) {
      const points = await ctx.tools.query('points', {
        where: { matchId: matchId.data },
        limit: 500,
      })
      if (!points.success) return points
      for (const point of points.data.records) {
        const result = await ctx.tools.update('points', point.recordId, {
          ownerId: grant.owner,
        })
        if (!result.success) return result
      }
      const result = await ctx.tools.update('matches', matchId.data, {
        teamId: matchId.data,
        status: 'tracking',
      })
      if (!result.success) return result
    }
    return { success: true, data: { role: grant.role } }
  },
  async logPoint(ctx) {
    const input = pointInput.safeParse(ctx.params)
    if (!input.success)
      return {
        success: false,
        error: 'Choose a valid shot location, type, winner and outcome.',
      }
    const grant = await access(ctx, input.data.matchId)
    if (!grant || grant.role === 'viewer') return denied
    if (grant.data.status === 'completed')
      return { success: false, error: 'Reopen the match before adding points.' }
    const shotBy = hitter(input.data)
    const expected =
      input.data.outcome === 'winner'
        ? shotBy
        : shotBy === 'player'
          ? 'opponent'
          : 'player'
    if (expected !== input.data.winner)
      return {
        success: false,
        error: 'The point winner must agree with the finishing-shot outcome.',
      }
    const rows = await ctx.tools.query('points', {
      where: { matchId: input.data.matchId },
      limit: 501,
    })
    if (!rows.success) return rows
    // Request id makes retries of one draft idempotent, without overwriting existing points.
    const duplicate =
      input.data.requestId &&
      rows.data.records.find((r) => r.data.requestId === input.data.requestId)
    if (duplicate)
      return { success: true, data: { recordId: duplicate.recordId } }
    if (rows.data.records.length >= 500)
      return {
        success: false,
        error: 'This match has reached the 500-point notebook limit.',
      }
    return ctx.tools.create(
      'points',
      { ...input.data, shotBy, ownerId: grant.owner },
      input.data.requestId
        ? `point_${input.data.matchId}_${input.data.requestId}`
        : undefined,
    )
  },
  async removePoint(ctx) {
    const input = z
      .object({ matchId: id, pointId: id })
      .strict()
      .safeParse(ctx.params)
    if (!input.success) return denied
    const grant = await access(ctx, input.data.matchId)
    if (!grant || grant.role === 'viewer') return denied
    const point = await ctx.tools.get('points', input.data.pointId)
    if (!point.success || point.data.record.data.matchId !== input.data.matchId)
      return denied
    return ctx.tools.remove('points', input.data.pointId)
  },
  async setMatchStatus(ctx) {
    const input = z
      .object({ matchId: id, status: z.enum(['tracking', 'completed']) })
      .strict()
      .safeParse(ctx.params)
    if (!input.success) return denied
    const grant = await access(ctx, input.data.matchId)
    if (!grant || grant.role !== 'owner') return denied
    return ctx.tools.update('matches', input.data.matchId, {
      status: input.data.status,
    })
  },
}
