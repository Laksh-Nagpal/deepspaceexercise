import { teamPermissions } from './collaboration-schema'
import type { CollectionSchema } from 'deepspace/schema'

export const matchesSchema: CollectionSchema = {
  name: 'matches',
  teamField: 'teamId',
  permissions: teamPermissions,
  columns: [
    {
      name: 'teamId',
      storage: 'text',
      interpretation: 'plain',
      immutable: false,
    },
    { name: 'status', storage: 'text', interpretation: 'plain' },
    {
      name: 'player',
      storage: 'text',
      interpretation: 'plain',
      required: true,
      maxLength: 80,
    },
    {
      name: 'opponent',
      storage: 'text',
      interpretation: 'plain',
      required: true,
      maxLength: 80,
    },
    {
      name: 'details',
      storage: 'text',
      interpretation: 'plain',
      maxLength: 500,
    },
  ],
}
export const pointsSchema: CollectionSchema = {
  name: 'points',
  ownerField: 'ownerId',
  teamField: 'matchId',
  permissions: teamPermissions,
  columns: [
    {
      name: 'ownerId',
      storage: 'text',
      interpretation: 'plain',
      immutable: false,
    },
    { name: 'rally', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'shotBy', storage: 'text', interpretation: 'plain' },
    { name: 'requestId', storage: 'text', interpretation: 'plain' },
    {
      name: 'matchId',
      storage: 'text',
      interpretation: 'plain',
      required: true,
      immutable: false,
    },
    {
      name: 'shotType',
      storage: 'text',
      interpretation: 'plain',
      required: true,
    },
    {
      name: 'winner',
      storage: 'text',
      interpretation: 'plain',
      required: true,
    },
    {
      name: 'outcome',
      storage: 'text',
      interpretation: 'plain',
      required: true,
    },
    { name: 'x', storage: 'number', interpretation: 'number', required: true },
    { name: 'y', storage: 'number', interpretation: 'number', required: true },
  ],
}
