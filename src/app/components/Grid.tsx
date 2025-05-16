'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Tile from './Tile'

type TileType = 'dirt' | 'empty' | 'stone' | 'monster'
interface TileData {
  type: TileType
  hasMetal: boolean
  explored?: boolean // er tile utforsket?
}

const GRID = 10
const START = { x: 0, y: 0 }

export default function Grid() {
  const [grid, setGrid] = useState<TileData[][]>(
    Array.from({ length: GRID }, () =>
      Array.from({ length: GRID }, () => ({ type: 'dirt', hasMetal: false, explored: false }))
    )
  )

  const [player, setPlayer] = useState(START)

  /** bestemmer innhold når vi prøver å gå inn i jord */
  const revealTile = (): { type: TileType; hasMetal: boolean } => {
    const r = Math.random()
    if (r < 0.05) return { type: 'stone', hasMetal: false }
    if (r < 0.08) return { type: 'monster', hasMetal: false }
    if (r < 0.23) return { type: 'empty', hasMetal: true } // 15 % metall
    return { type: 'empty', hasMetal: false }
  }

  const handleMove = useCallback(
    (dx: number, dy: number) => {
      const nx = player.x + dx
      const ny = player.y + dy
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return

      setGrid(prev => {
        let updated = prev.map((row, y) =>
          row.map((tile, x) =>
            x === nx && y === ny ? { ...tile, explored: true } : tile
          )
        )

        const target = updated[ny][nx]

        // hvis ruten er jord → avslør først
        if (target.type === 'dirt') {
          const revealed = revealTile()
          updated = updated.map((row, y) =>
            row.map((tile, x) =>
              x === nx && y === ny ? { ...tile, ...revealed, explored: true } : tile
            )
          )
        }

        // nå vet vi hva som er der
        const final = updated[ny][nx]
        if (final.type === 'stone' || final.type === 'monster') {
          // blokkert – spilleren flyttes ikke
          return updated
        }

        // ellers flytt spilleren
        setPlayer({ x: nx, y: ny })
        return updated
      })
    },
    [player]
  )

  /* tastestyring */
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') handleMove(0, -1)
      if (e.key === 'ArrowDown' || e.key === 's') handleMove(0, 1)
      if (e.key === 'ArrowLeft' || e.key === 'a') handleMove(-1, 0)
      if (e.key === 'ArrowRight' || e.key === 'd') handleMove(1, 0)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [handleMove])

  return (
    <div className="grid grid-cols-10 gap-px bg-amber-800">
      {grid.map((row, y) =>
        row.map((tile, x) => (
          <Tile
            key={`${x}-${y}`}
            {...tile}
            isPlayer={x === player.x && y === player.y}
            explored={tile.explored}
          />
        ))
      )}
    </div>
  )
}
