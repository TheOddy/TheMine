'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import Tile from './Tile'

type TileType = 'dirt' | 'empty' | 'stone' | 'monster'
interface TileData {
  type: TileType
  hasMetal: boolean
  explored?: boolean // is tile explored?
  justRevealed?: boolean
  visible?: boolean // is tile visible from the start?
}

const GRID = 10
const START = { x: 0, y: 0 }
const METALS = 12

type Highscore = { name: string, time: number, date: string }

export default function Grid() {
  // Helper to generate the initial grid with exactly 12 metals and rocks
  function generateInitialGrid() {
    // First, create a flat array of all positions except the start
    const positions = []
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!(x === START.x && y === START.y)) positions.push({ x, y })
      }
    }
    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[positions[i], positions[j]] = [positions[j], positions[i]]
    }
    // Place metals
    const metalPositions = positions.slice(0, METALS)
    // Place rocks (5% of the rest)
    const rest = positions.slice(METALS)
    const numRocks = Math.floor(rest.length * 0.05)
    const rockPositions = rest.slice(0, numRocks)
    // Build grid
    return Array.from({ length: GRID }, (_, y) =>
      Array.from({ length: GRID }, (_, x) => {
        let type: TileType = 'dirt';
        let hasMetal = false;
        let explored = false;
        let visible = false;
        if (x === START.x && y === START.y) explored = true;
        else if (metalPositions.some(p => p.x === x && p.y === y)) {
          type = 'empty';
          hasMetal = true;
          visible = true;
        } else if (rockPositions.some(p => p.x === x && p.y === y)) {
          type = 'stone';
          visible = true;
        }
        return { type, hasMetal, explored, visible };
      })
    );
  }

  const [grid, setGrid] = useState<TileData[][]>(generateInitialGrid());

  const [player, setPlayer] = useState(START)
  const playerRef = useRef(player)
  useEffect(() => { playerRef.current = player }, [player])
  const [metalCount, setMetalCount] = useState(0)
  const [monsterPositions, setMonsterPositions] = useState<{ x: number, y: number }[]>([])
  const [caught, setCaught] = useState(false)
  const [win, setWin] = useState(false)
  const [startTime, setStartTime] = useState(Date.now())
  const [highscores, setHighscores] = useState<Highscore[]>([])
  const [pendingScore, setPendingScore] = useState<{ time: number, date: string } | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')

  // Load highscores from localStorage
  useEffect(() => {
    const hs = localStorage.getItem('highscores')
    if (hs) setHighscores(JSON.parse(hs))
  }, [])

  // Helper to check if a tile is walkable for monsters
  function isWalkable(tile: TileData) {
    return tile.explored && tile.type !== 'stone' && tile.type !== 'monster';
  }

  // Move all monsters towards the player every second
  useEffect(() => {
    if (caught || win) return;
    const interval = setInterval(() => {
      setGrid(prevGrid => {
        let newGrid = prevGrid.map(row => row.slice())
        let newMonsterPositions: { x: number, y: number }[] = []
        let playerCaught = false
        const player = playerRef.current;
        for (let y = 0; y < GRID; y++) {
          for (let x = 0; x < GRID; x++) {
            const tile = prevGrid[y][x];
            if (tile.type === 'monster') {
              // If just revealed, skip moving this tick and remove the flag
              if (tile.justRevealed) {
                newGrid[y][x] = { ...tile, justRevealed: false };
                newMonsterPositions.push({ x, y });
                continue;
              }
              // Find best move towards player
              let best = { x, y }
              let minDist = Math.abs(player.x - x) + Math.abs(player.y - y)
              const moves = [
                { dx: 0, dy: -1 },
                { dx: 0, dy: 1 },
                { dx: -1, dy: 0 },
                { dx: 1, dy: 0 }
              ]
              for (const { dx, dy } of moves) {
                const nx = x + dx
                const ny = y + dy
                if (
                  nx >= 0 && nx < GRID && ny >= 0 && ny < GRID &&
                  isWalkable(prevGrid[ny][nx]) &&
                  !(prevGrid[ny][nx].type === 'monster')
                ) {
                  const dist = Math.abs(player.x - nx) + Math.abs(player.y - ny)
                  if (dist < minDist) {
                    minDist = dist
                    best = { x: nx, y: ny }
                  }
                }
              }
              // Move monster if possible
              if (best.x !== x || best.y !== y) {
                newGrid[y][x] = { ...newGrid[y][x], type: 'empty' }
                newGrid[best.y][best.x] = { ...newGrid[best.y][best.x], type: 'monster', explored: true }
                newMonsterPositions.push({ x: best.x, y: best.y })
                // Check if monster caught the player
                if (best.x === player.x && best.y === player.y) {
                  playerCaught = true
                }
              } else {
                newMonsterPositions.push({ x, y })
              }
            }
          }
        }
        if (playerCaught) setCaught(true)
        setMonsterPositions(newMonsterPositions)
        return newGrid
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [caught, win])

  // Update monster positions whenever grid changes
  useEffect(() => {
    const positions: { x: number, y: number }[] = []
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (grid[y][x].type === 'monster') {
          positions.push({ x, y })
        }
      }
    }
    setMonsterPositions(positions)
  }, [grid])

  const handleMove = useCallback(
    (dx: number, dy: number) => {
      const nx = player.x + dx
      const ny = player.y + dy
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return

      // First, check what's in the target tile
      const target = grid[ny][nx]
      let newTileContent = target

      // Only reveal if it's unexplored dirt (monsters can pop up)
      if (!target.explored && target.type === 'dirt') {
        // Only monsters or empty can be revealed now
        const r = Math.random();
        if (r < 0.15) { // 15% chance for monster
          newTileContent = { type: 'monster', hasMetal: false, explored: true, justRevealed: true };
        } else {
          newTileContent = { type: 'empty', hasMetal: false, explored: true };
        }
      }

      // If the revealed tile is blocked, don't move
      if (newTileContent.type === 'stone' || newTileContent.type === 'monster') {
        setGrid(prev => 
          prev.map((row, y) =>
            row.map((tile, x) =>
              x === nx && y === ny
                ? { ...newTileContent, explored: newTileContent.type === 'monster' ? true : false, visible: true }
                : tile
            )
          )
        )
        return
      }

      // If we get here, the tile is safe to move to
      // If the tile has metal, pick it up
      let pickedUpMetal = false;
      if (newTileContent.hasMetal) {
        setMetalCount(count => count + 1)
        newTileContent = { ...newTileContent, hasMetal: false, explored: true, visible: true }
        pickedUpMetal = true;
      }

      setGrid(prev => 
        prev.map((row, y) =>
          row.map((tile, x) =>
            x === nx && y === ny ? { ...newTileContent, explored: true, visible: true } : tile
          )
        )
      )
      setPlayer({ x: nx, y: ny })

      // Check for win condition after picking up metal
      if (pickedUpMetal && metalCount + 1 === METALS) {
        setWin(true)
        const timeUsed = ((Date.now() - startTime) / 1000)
        setPendingScore({ time: timeUsed, date: new Date().toLocaleString() })
      }
    },
    [player, grid, metalCount, highscores, startTime]
  )

  /* tastestyring */
  useEffect(() => {
    if (win || caught) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') handleMove(0, -1)
      if (e.key === 'ArrowDown' || e.key === 's') handleMove(0, 1)
      if (e.key === 'ArrowLeft' || e.key === 'a') handleMove(-1, 0)
      if (e.key === 'ArrowRight' || e.key === 'd') handleMove(1, 0)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [handleMove, win, caught])

  // When caught, start a 5s timer to reset the game
  useEffect(() => {
    if (caught) {
      const timer = setTimeout(() => {
        setGrid(generateInitialGrid())
        setPlayer(START)
        setMetalCount(0)
        setCaught(false)
        setStartTime(Date.now())
        setWin(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [caught])

  // Function to reset the game
  function resetGame() {
    setGrid(generateInitialGrid())
    setPlayer(START)
    setMetalCount(0)
    setStartTime(Date.now())
    setWin(false)
    setCaught(false)
    setPendingScore(null)
    setNameInput('')
    setNameError('')
  }

  // Function to submit highscore
  function submitHighscore(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const name = nameInput.trim();
    if (!name) {
      setNameError('Name is required.');
      return;
    }
    if (name.length > 20) {
      setNameError('Name must be 20 characters or less.');
      return;
    }
    if (!pendingScore) return;
    const newScore: Highscore = { name, time: Number(pendingScore.time.toFixed(2)), date: pendingScore.date };
    const updatedScores = [...highscores, newScore]
      .sort((a, b) => a.time - b.time)
      .slice(0, 1000);
    setHighscores(updatedScores);
    localStorage.setItem('highscores', JSON.stringify(updatedScores));
    setPendingScore(null);
    setNameInput('');
    setNameError('');
  }

  // Allow pressing Enter to trigger Play Again or submit highscore
  useEffect(() => {
    if (!(win || caught)) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (win && pendingScore) {
          submitHighscore();
        } else {
          resetGame();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [win, caught, pendingScore, nameInput]);

  return (
    <>
      <div className="mb-2 text-white font-bold">Metals: {metalCount} / {METALS}</div>
      <div className="grid grid-cols-10 bg-amber-800">
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
      {caught && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
          <div className="text-4xl text-red-500 font-bold p-8 rounded-lg bg-white bg-opacity-90 border-4 border-red-700 shadow-xl flex flex-col items-center">
            <div>You were caught by a monster!</div>
            <button
              className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg text-xl hover:bg-red-700 transition"
              onClick={resetGame}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
      {win && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
          <div className="text-4xl text-green-600 font-bold p-8 rounded-lg bg-white bg-opacity-90 border-4 border-green-700 shadow-xl flex flex-col items-center max-w-full">
            <div>🎉 You collected all the metals! 🎉</div>
            {pendingScore ? (
              <form className="flex flex-col items-center mt-6 w-full" onSubmit={submitHighscore}>
                <div className="text-black text-lg mb-2">Your time: <span className="font-mono">{pendingScore.time.toFixed(2)}s</span></div>
                <input
                  className="border border-gray-400 rounded px-3 py-1 text-lg mb-2 w-64 max-w-full"
                  type="text"
                  maxLength={20}
                  placeholder="Enter your name (max 20 chars)"
                  value={nameInput}
                  onChange={e => { setNameInput(e.target.value); setNameError(''); }}
                  autoFocus
                />
                {nameError && <div className="text-red-600 text-base mb-2">{nameError}</div>}
                <button
                  className="px-6 py-2 bg-green-600 text-white rounded-lg text-xl hover:bg-green-700 transition"
                  type="submit"
                >
                  Submit
                </button>
              </form>
            ) : (
              <>
                <div className="text-lg text-black mt-4">Highscores (fastest times):</div>
                <div className="overflow-y-auto max-h-64 w-full">
                  <ol className="text-black text-lg mt-2 mb-4 w-80 max-w-full">
                    {highscores.slice(0, 10).map((score, i) => (
                      <li key={i} className="flex justify-between items-center">
                        <span className="font-mono">{i + 1}. {score.name}</span>
                        <span className="font-mono">{score.time.toFixed(2)}s</span>
                        <span className="text-xs">({score.date})</span>
                      </li>
                    ))}
                  </ol>
                </div>
                {highscores.length > 10 && (
                  <div className="text-black text-base">Scroll for more...</div>
                )}
                <button
                  className="mt-2 px-6 py-2 bg-green-600 text-white rounded-lg text-xl hover:bg-green-700 transition"
                  onClick={resetGame}
                >
                  Play Again
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
