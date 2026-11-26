import { evidenceFor } from './evidence'
import { pointVersion, type Match, type Point, type Shot } from './model'
import type { SavedReport } from './report'

/** Public, deterministic synthetic fixtures. Never copied from a private match. */
export const demoMatch: Match = {
  player: 'Alex (demo)',
  opponent: 'Jordan (demo)',
  details: 'Synthetic club practice match. Every point here is fictional.',
  status: 'completed',
}
const lengths = [3, 5, 4, 7, 3, 6, 5, 3, 4, 5, 3, 6]
export const demoPoints: Point[] = lengths.map((length, i) => {
  const rally: Shot[] = Array.from({ length }, (_, j) => ({
    shotBy: j % 2 ? 'opponent' : 'player',
    shotType:
      j === 0
        ? 'serve'
        : j % 3 === 0
          ? 'volley'
          : j % 2
            ? 'backhand'
            : 'forehand',
    x: 0.3 + ((i + j) % 5) * 0.09,
    y: j % 2 ? 0.65 + (j % 3) * 0.07 : 0.18 + (j % 3) * 0.08,
  }))
  const last = rally.at(-1)!,
    winner = i % 3 === 0 ? 'opponent' : 'player'
  return {
    matchId: 'public-demo',
    ...last,
    rally,
    winner,
    outcome: last.shotBy === winner ? 'winner' : 'unforced error',
  }
})
export const demoRows = demoPoints.map((data, i) => ({
  recordId: `demo-point-${i + 1}`,
  data,
  createdAt: '2026-11-26T12:00:00.000Z',
  updatedAt: '2026-11-26T12:00:00.000Z',
}))
export const demoReport: SavedReport = {
  sourceVersion: pointVersion(demoRows),
  pointCount: demoPoints.length,
  evidence: evidenceFor(demoPoints),
  recommendations: [
    {
      title: 'Practice keeping a rally neutral before attacking',
      action:
        'Compare your longer rallies with the shorter points in replay. In practice, try an extra controlled ball before changing direction. This fictional sample is too small to establish a causal advantage.',
      evidenceIds: ['long-rallies', 'rally-length'],
    },
    {
      title: 'Use placement to plan the next ball',
      action:
        'Review where your earlier shot landed before the finishing winner. Try a deliberate target, then record whether it creates the next ball you expected. The diagram records landing locations, not player movement.',
      evidenceIds: ['setup-left', 'setup-right'],
    },
    {
      title: 'Build margin into finishing attempts',
      action:
        'Use the error counts to choose a practice focus, then test a safer target under pressure. Do not treat these invented results as a diagnosis of a real player.',
      evidenceIds: ['errors', 'points'],
    },
  ],
}
