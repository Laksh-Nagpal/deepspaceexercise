import { useState } from 'react'
import type { Point } from './model'

type Location = { x: number; y: number }
export function Court({
  points,
  selected,
  onSelect,
}: {
  points: Point[]
  selected?: Location
  onSelect?: (p: Location) => void
}) {
  const [cursor, setCursor] = useState<Location>({ x: 0.5, y: 0.5 })
  return (
    <svg
      viewBox="0 0 420 720"
      className={`tennis-court ${onSelect ? 'interactive' : ''}`}
      role={onSelect ? 'button' : 'img'}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={
        onSelect
          ? 'Tennis court: click a shot location, or use arrow keys and Enter'
          : 'Tennis court with finishing shot locations'
      }
      onClick={
        onSelect
          ? (e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              onSelect({
                x: Math.max(
                  0,
                  Math.min(1, (e.clientX - rect.left) / rect.width),
                ),
                y: Math.max(
                  0,
                  Math.min(1, (e.clientY - rect.top) / rect.height),
                ),
              })
            }
          : undefined
      }
      onKeyDown={
        onSelect
          ? (e) => {
              if (
                ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
                  e.key,
                )
              ) {
                e.preventDefault()
                const next = {
                  x: Math.max(
                    0,
                    Math.min(
                      1,
                      cursor.x +
                        (e.key === 'ArrowLeft'
                          ? -0.025
                          : e.key === 'ArrowRight'
                            ? 0.025
                            : 0),
                    ),
                  ),
                  y: Math.max(
                    0,
                    Math.min(
                      1,
                      cursor.y +
                        (e.key === 'ArrowUp'
                          ? -0.025
                          : e.key === 'ArrowDown'
                            ? 0.025
                            : 0),
                    ),
                  ),
                }
                setCursor(next)
                onSelect(next)
              }
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(cursor)
              }
            }
          : undefined
      }
    >
      <title>Overhead tennis court. Top is the opponent’s end.</title>
      <rect width="420" height="720" rx="8" fill="#235442" />
      <rect
        x="60"
        y="35"
        width="300"
        height="650"
        fill="#326b53"
        stroke="#eef3dd"
        strokeWidth="2"
      />
      <path
        d="M97.5 35V685 M322.5 35V685 M97.5 185H322.5 M97.5 535H322.5 M210 185V535 M210 35V42 M210 678V685"
        fill="none"
        stroke="#eef3dd"
        strokeWidth="2"
      />
      <path d="M38 360H382" stroke="#152e27" strokeWidth="8" />
      <path
        d="M38 358H382"
        stroke="#f7f8ec"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x * 420}
          cy={p.y * 720}
          r="6"
          fill={p.winner === 'player' ? '#d6f27a' : '#ffb194'}
          stroke="#153b2d"
          strokeWidth="1.5"
        >
          <title>
            {p.shotType} · {p.outcome} ·{' '}
            {p.winner === 'player' ? 'point won' : 'point lost'}
          </title>
        </circle>
      ))}
      {selected && (
        <g stroke="#fff" fill="none" strokeWidth="2">
          <circle cx={selected.x * 420} cy={selected.y * 720} r="11" />
          <path
            d={`M${selected.x * 420 - 17} ${selected.y * 720}h34 M${selected.x * 420} ${selected.y * 720 - 17}v34`}
          />
        </g>
      )}
    </svg>
  )
}
