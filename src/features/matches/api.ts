import { getAuthToken } from 'deepspace'
/** Identity comes from the SDK's verified JWT, never client-supplied user fields. */
export async function rallyAction<T>(
  name: string,
  params: object = {},
): Promise<T> {
  const token = await getAuthToken()
  if (!token) throw new Error('Please sign in again before saving.')
  const response = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  })
  const result = (await response.json()) as {
    success?: boolean
    error?: string
    data?: T
  }
  if (!response.ok || !result.success || result.data === undefined)
    throw new Error(
      result.error || 'Could not save. Check your connection and try again.',
    )
  return result.data
}
export async function matchAction(
  name: string,
  params: object,
): Promise<string> {
  return (await rallyAction<{ recordId: string }>(name, params)).recordId
}
