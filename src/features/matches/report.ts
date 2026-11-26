import { z } from 'zod'
export const reportSchema = z.object({
  sourceVersion: z.string(),
  pointCount: z.number(),
  evidence: z.array(
    z.object({ id: z.string(), label: z.string(), value: z.string() }),
  ),
  recommendations: z.array(
    z.object({
      title: z.string(),
      action: z.string(),
      evidenceIds: z.array(z.string()),
    }),
  ),
})
export type SavedReport = z.infer<typeof reportSchema>
export function parseSavedReport(raw?: string): SavedReport | null {
  try {
    const parsed = reportSchema.safeParse(JSON.parse(raw ?? 'null'))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
