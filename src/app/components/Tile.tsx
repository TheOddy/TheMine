'use client'

type Props = {
  type: 'dirt' | 'empty' | 'stone' | 'monster'
  hasMetal: boolean
  isPlayer: boolean
  explored?: boolean
}

export default function Tile({ type, hasMetal, isPlayer, explored }: Props) {
  let emoji = ''              // jord
  if (type !== 'dirt') {
    emoji = type === 'empty' ? '' : type === 'stone' ? '🪨' : '👾'
    if (hasMetal && type === 'empty') emoji = '💰'
  }
  if (isPlayer) emoji = '🙂'

  // Always add bg-black if explored
  const baseClasses = "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
  const bgClass = explored ? "bg-black" : ""
  const textClass = "text-xl"

  return (
    <div className={`${baseClasses} ${bgClass} ${textClass}`}>
      {emoji}
    </div>
  )
}
