import { z } from 'zod'
import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { access, denied, emailFor } from './access'
const id = z.string().min(1).max(200)
export const collaborationActions: Record<string, ActionHandler<Env>> = {
  async inviteParticipant(ctx) {
    const input = z
      .object({
        matchId: id,
        email: z.email().max(200),
        role: z.enum(['coach', 'viewer']),
      })
      .strict()
      .safeParse(ctx.params)
    if (!input.success)
      return { success: false, error: 'Enter a valid email and role.' }
    const grant = await access(ctx, input.data.matchId)
    if (!grant || grant.role !== 'owner') return denied
    const email = input.data.email.toLowerCase().trim()
    if (email === (await emailFor(ctx)))
      return { success: false, error: 'You already own this match.' }
    const existing = await ctx.tools.query('invitations', {
      where: { matchId: input.data.matchId, email, status: 'pending' },
      limit: 1,
    })
    if (!existing.success) return existing
    if (existing.data.records.length)
      return {
        success: false,
        error:
          'A pending invitation already exists for this email. Cancel it before changing the role.',
      }
    return ctx.tools.create('invitations', {
      ...input.data,
      email,
      status: 'pending',
      matchLabel: `${grant.data.player} vs ${grant.data.opponent}`,
    })
  },
  async pendingInvitations(ctx) {
    const email = await emailFor(ctx)
    if (!email) return { success: true, data: { records: [] } }
    return ctx.tools.query('invitations', {
      where: { email, status: 'pending' },
      limit: 100,
    })
  },
  async acceptInvitation(ctx) {
    const input = z.object({ invitationId: id }).strict().safeParse(ctx.params)
    if (!input.success) return denied
    const invite = await ctx.tools.get('invitations', input.data.invitationId)
    if (
      !invite.success ||
      invite.data.record.data.status !== 'pending' ||
      invite.data.record.data.email !== (await emailFor(ctx))
    )
      return denied
    const data = invite.data.record.data
    const match = await ctx.tools.get('matches', String(data.matchId))
    if (
      !match.success ||
      match.data.record.createdBy !== invite.data.record.createdBy
    )
      return denied
    const member = await ctx.tools.create(
      'team_members',
      {
        TeamId: data.matchId,
        UserId: ctx.userId,
        Status: 'active',
        role: data.role,
        email: data.email,
        ownerId: match.data.record.createdBy,
      },
      `member_${data.matchId}_${ctx.userId}`,
    )
    if (!member.success) return member
    const updated = await ctx.tools.update(
      'invitations',
      input.data.invitationId,
      { status: 'accepted' },
    )
    return updated.success
      ? { success: true, data: { recordId: data.matchId } }
      : updated
  },
  async revokeParticipant(ctx) {
    const input = z
      .object({ matchId: id, memberId: id })
      .strict()
      .safeParse(ctx.params)
    if (!input.success) return denied
    const grant = await access(ctx, input.data.matchId)
    if (!grant || grant.role !== 'owner') return denied
    const member = await ctx.tools.get('team_members', input.data.memberId)
    if (
      !member.success ||
      member.data.record.data.TeamId !== input.data.matchId
    )
      return denied
    // Retain the row with inactive status so the SDK notifies the affected open socket.
    return ctx.tools.update('team_members', input.data.memberId, {
      Status: 'revoked',
    })
  },
  async cancelInvitation(ctx) {
    const input = z.object({ invitationId: id }).strict().safeParse(ctx.params)
    if (!input.success) return denied
    const invite = await ctx.tools.get('invitations', input.data.invitationId)
    if (
      !invite.success ||
      invite.data.record.createdBy !== ctx.userId ||
      invite.data.record.data.status !== 'pending'
    )
      return denied
    return ctx.tools.update('invitations', input.data.invitationId, {
      status: 'cancelled',
    })
  },
  async addObservation(ctx) {
    const input = z
      .object({ matchId: id, text: z.string().trim().min(1).max(1000) })
      .strict()
      .safeParse(ctx.params)
    if (!input.success)
      return {
        success: false,
        error: 'Enter an observation (up to 1,000 characters).',
      }
    const grant = await access(ctx, input.data.matchId)
    if (!grant || grant.role === 'viewer') return denied
    const email = await emailFor(ctx)
    return ctx.tools.create('observations', {
      ...input.data,
      ownerId: grant.owner,
      author: email ?? 'Match contributor',
    })
  },
}
