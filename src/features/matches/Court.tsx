import { useState } from 'react'
import { shotsOf, type Shot, type Point } from './model'

type Location = { x: number; y: number }
export function Court({
  points,
  selected,
  onSelect,
  shots,
  numbered = false,
  activeIndex,
}: {
  points: Point[]
  selected?: Location
  onSelect?: (p: Location) => void
  shots?: Shot[]
  numbered?: boolean
  activeIndex?: number
}) {
  const marks = shots ?? points.flatMap(shotsOf)
  const [cursor, setCursor] = useState<Location>({ x: 0.5, y: 0.5 })
  const [focused, setFocused] = useState(false)
  const highlight = onSelect && focused ? cursor : selected
  return (
    <svg
      viewBox="0 0 420 720"
      className={`tennis-court ${onSelect ? 'interactive' : ''}`}
      role={onSelect ? 'button' : 'img'}
      tabIndex={onSelect ? 0 : undefined}
      onFocus={() => {
        setFocused(true)
        if (selected) setCursor(selected)
      }}
      onBlur={() => setFocused(false)}
      aria-label={
        onSelect
          ? 'Tennis court: click a shot location, or use arrow keys and Enter'
          : 'Tennis court with recorded shot locations'
      }
      onClick={
        onSelect
          ? (e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const next = {
                x: Math.max(
                  0,
                  Math.min(1, (e.clientX - rect.left) / rect.width),
                ),
                y: Math.max(
                  0,
                  Math.min(1, (e.clientY - rect.top) / rect.height),
                ),
              }
              setCursor(next)
              onSelect(next)
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
      {numbered && marks.length > 1 && (
        <polyline
          data-testid="rally-path"
          points={marks.map((p) => `${p.x * 420},${p.y * 720}`).join(' ')}
          fill="none"
          stroke="#eff5d3"
          opacity=".7"
          strokeWidth="2"
          strokeDasharray="5 5"
          pointerEvents="none"
        />
      )}
      {marks.map((p, i) => (
        <g key={i} pointerEvents="none">
          <circle
            className="shot-marker"
            data-shot-number={i + 1}
            cx={p.x * 420}
            cy={p.y * 720}
            r={numbered ? (activeIndex === i ? 12 : 10) : 6}
            fill={p.shotBy === 'player' ? '#d6f27a' : '#ffb194'}
            stroke={activeIndex === i ? '#fff' : '#153b2d'}
            strokeWidth={activeIndex === i ? 3 : 1.5}
          >
            <title>{`Shot ${i + 1}: ${p.shotBy === 'player' ? 'Player' : 'Opponent'} · ${p.shotType}`}</title>
          </circle>
          {numbered && (
            <text
              x={p.x * 420}
              y={p.y * 720 + 4}
              textAnchor="middle"
              fill="#153b2d"
              fontSize="11"
              fontWeight="700"
            >
              {i + 1}
            </text>
          )}
        </g>
      ))}
      {highlight && (
        <g stroke="#fff" fill="none" strokeWidth="2">
          <circle cx={highlight.x * 420} cy={highlight.y * 720} r="11" />
          <path
            d={`M${highlight.x * 420 - 17} ${highlight.y * 720}h34 M${highlight.x * 420} ${highlight.y * 720 - 17}v34`}
          />
        </g>
      )}
    </svg>
  )
}
