import type { CollectionSchema, RolePermissions } from 'deepspace/schema'
const deny: RolePermissions = {
  read: false,
  create: false,
  update: false,
  delete: false,
}
// `access` uses native per-record checks. SDK 0.44.2's `team` query fast path
// assumes createdBy ownership and ignores ownerField on coach-created rows.
const team: RolePermissions = { ...deny, read: 'access' }
export const teamPermissions = {
  '*': deny,
  member: team,
  viewer: team,
  admin: team,
}
export const privatePermissions = {
  '*': deny,
  member: { ...deny, read: 'own' as const },
  viewer: { ...deny, read: 'own' as const },
  admin: { ...deny, read: 'own' as const },
}
const text = (name: string, maxLength = 200) => ({
  name,
  storage: 'text' as const,
  interpretation: 'plain',
  maxLength,
})
export const teamMembersSchema: CollectionSchema = {
  name: 'team_members',
  ownerField: 'ownerId',
  teamField: 'TeamId',
  permissions: teamPermissions,
  // SDK 0.44.2 membership notifications read `UserId`; SQL identifiers are case-normalized.
  columns: [
    text('TeamId'),
    text('UserId'),
    text('Status'),
    text('role'),
    text('email'),
    text('ownerId'),
  ],
  uniqueOn: ['TeamId', 'UserId'],
}
export const invitationsSchema: CollectionSchema = {
  name: 'invitations',
  permissions: privatePermissions,
  columns: [
    text('matchId'),
    text('email'),
    text('role'),
    text('status'),
    text('matchLabel'),
  ],
}
export const observationsSchema: CollectionSchema = {
  name: 'observations',
  ownerField: 'ownerId',
  teamField: 'matchId',
  permissions: teamPermissions,
  columns: [
    text('matchId'),
    text('ownerId'),
    text('author'),
    text('text', 1000),
  ],
}
export const analysesSchema: CollectionSchema = {
  name: 'analyses',
  ownerField: 'ownerId',
  teamField: 'matchId',
  permissions: teamPermissions,
  columns: [
    text('matchId'),
    text('ownerId'),
    text('fingerprint'),
    text('report', 25000),
    text('model'),
  ],
}
