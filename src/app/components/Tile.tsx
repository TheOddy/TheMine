'use client'

type Props = {
  type: 'dirt' | 'empty' | 'stone' | 'monster'
  hasMetal: boolean
  isPlayer: boolean
  explored?: boolean
  visible?: boolean
}

export default function Tile({ type, hasMetal, isPlayer, explored, visible }: Props) {
  let emoji = ''
  // Show rocks and metals if visible, regardless of explored
  if (visible || explored) {
    if (type === 'stone') emoji = '🪨'
    else if (type === 'monster') emoji = '👾'
    else if (hasMetal && type === 'empty') emoji = '💰'
  }
  if (isPlayer) emoji = '🙂'

  const baseClasses = "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
  const bgClass = explored ? "bg-black" : ""
  const textClass = "text-xl"

  return (
    <div className={`${baseClasses} ${bgClass} ${textClass}`}>
      {emoji}
    </div>
  )
}
