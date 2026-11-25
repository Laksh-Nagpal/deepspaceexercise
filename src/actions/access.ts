import type { ActionContext } from 'deepspace/worker'
import type { Env } from '../../worker'
export type MatchContext = ActionContext<Env>
export type MatchAccess = {
  owner: string
  role: 'owner' | 'coach' | 'viewer'
  data: Record<string, unknown>
}
export async function access(
  ctx: MatchContext,
  matchId: string,
): Promise<MatchAccess | null> {
  const match = await ctx.tools.get('matches', matchId)
  if (!match.success) return null
  const owner = match.data.record.createdBy
  if (owner === ctx.userId)
    return { owner, role: 'owner', data: match.data.record.data }
  const member = await ctx.tools.query('team_members', {
    where: { TeamId: matchId, UserId: ctx.userId, Status: 'active' },
    limit: 1,
  })
  if (!member.success || !member.data.records.length) return null
  const role = member.data.records[0].data.role
  return role === 'coach' || role === 'viewer'
    ? { owner, role, data: match.data.record.data }
    : null
}
export const denied = {
  success: false as const,
  error: 'Match not found or access denied.',
}
export async function emailFor(ctx: MatchContext) {
  const user = await ctx.tools.get('users', ctx.userId)
  return user.success && typeof user.data.record.data.email === 'string'
    ? user.data.record.data.email.toLowerCase().trim()
    : null
}
