/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 *
 * Add schemas by creating a file in src/schemas/ and importing it here.
 */

import type { CollectionSchema } from 'deepspace/schema'
import {
  teamMembersSchema,
  invitationsSchema,
  observationsSchema,
  analysesSchema,
} from './schemas/collaboration-schema'
import { usersSchema } from './schemas/users-schema'
import { matchesSchema, pointsSchema } from './schemas/matches-schema'
import { settingsSchema } from './schemas/admin-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  matchesSchema,
  pointsSchema,
  teamMembersSchema,
  invitationsSchema,
  observationsSchema,
  analysesSchema,
]
