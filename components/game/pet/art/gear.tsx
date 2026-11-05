// Evolution gear — drawn around a local origin (0,0) = anchor point,
// at a base width of 34 units (hats) / 28 units (neckerchief).

const INK  = "#1e293b"
const GOLD = "#fbbf24"
const GOLD_DARK = "#92400e"

export function SailorCap({ x, y, w }: { x: number; y: number; w: number }) {
  const s = w / 34
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(-8)`}>
      {/* dome */}
      <path d="M-13 -1.5 C-13 -12.5 13 -12.5 13 -1.5 Z" fill="#f8fafc" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M-7 -8.5 C-4 -10.2 1 -10.6 4 -10" fill="none" stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" opacity={0.9} />
      {/* rolled brim */}
      <path d="M-17 -2.5 C-17 -6.5 17 -6.5 17 -2.5 C17 1.8 -17 1.8 -17 -2.5 Z" fill="#ffffff" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M-15 -2.6 C-8 -4.4 8 -4.4 15 -2.6" fill="none" stroke="#2563eb" strokeWidth={1.6} strokeLinecap="round" />
    </g>
  )
}

export function CaptainHat({ x, y, w }: { x: number; y: number; w: number }) {
  const s = w / 34
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(-4)`}>
      {/* white top cover */}
      <path d="M-18.5 -11 C-20.5 -20.5 20.5 -20.5 18.5 -11 L14.5 -5.5 L-14.5 -5.5 Z" fill="#ffffff" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M-11 -16 C-5 -18 4 -18.2 9 -17" fill="none" stroke="#e2e8f0" strokeWidth={1.6} strokeLinecap="round" />
      {/* band */}
      <path d="M-14.5 -6.5 L14.5 -6.5 L14.5 0.8 L-14.5 0.8 Z" fill={INK} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M-14.5 -6.3 L14.5 -6.3 M-14.5 0.6 L14.5 0.6" stroke={GOLD} strokeWidth={1.4} />
      {/* badge */}
      <ellipse cx={0} cy={-6.4} rx={4.6} ry={4.2} fill={GOLD} stroke={GOLD_DARK} strokeWidth={1.1} />
      <path d="M0 -9 L0 -4 M-2.2 -5.4 Q0 -3.2 2.2 -5.4 M-1.6 -8 L1.6 -8" fill="none" stroke={GOLD_DARK} strokeWidth={0.95} strokeLinecap="round" />
      {/* visor */}
      <path d="M-15.5 0 Q0 8 15.5 0 Q0 3.6 -15.5 0 Z" fill="#0f172a" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M-11.5 2 Q0 5.4 11.5 2" fill="none" stroke={GOLD} strokeWidth={1.1} strokeLinecap="round" />
    </g>
  )
}

/** Perched on top of the captain's hat, tilted for swagger. */
export function Crown({ x, y, w, animated }: { x: number; y: number; w: number; animated: boolean }) {
  const s = w / 34
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(5 -16.5) rotate(13) scale(0.86)`}>
      <path d="M-10 0 L-11.5 -11 L-5 -5.5 L0 -13 L5 -5.5 L11.5 -11 L10 0 Z" fill="#fcd34d" stroke={GOLD_DARK} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M-10 0 L10 0 L10.3 -2.8 L-10.3 -2.8 Z" fill="#f59e0b" stroke={GOLD_DARK} strokeWidth={1.1} strokeLinejoin="round" />
      <circle cx={0} cy={-5} r={1.9} fill="#ef4444" stroke={GOLD_DARK} strokeWidth={0.7} />
      <circle cx={-6} cy={-4} r={1.3} fill="#3b82f6" />
      <circle cx={6} cy={-4} r={1.3} fill="#3b82f6" />
      <circle cx={-11.5} cy={-11} r={1.5} fill="#fef3c7" stroke={GOLD_DARK} strokeWidth={0.8} />
      <circle cx={0} cy={-13} r={1.7} fill="#fef3c7" stroke={GOLD_DARK} strokeWidth={0.8} />
      <circle cx={11.5} cy={-11} r={1.5} fill="#fef3c7" stroke={GOLD_DARK} strokeWidth={0.8} />
      {/* gleam */}
      <g transform="translate(-4 -9)">
        <path d="M0 -3 L0.7 -0.7 L3 0 L0.7 0.7 L0 3 L-0.7 0.7 L-3 0 L-0.7 -0.7 Z" fill="#ffffff">
          {animated && (
            <animateTransform attributeName="transform" type="scale" values="0;1.1;0;0" keyTimes="0;0.15;0.3;1" dur="3.2s" repeatCount="indefinite" />
          )}
        </path>
      </g>
    </g>
  )
}

export function Neckerchief({ x, y, w, color }: { x: number; y: number; w: number; color: string }) {
  const s = w / 28
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-1.5 2 L-8.5 12.5 L-2.5 11 Z" fill={color} stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
      <path d="M1.5 2 L8.5 12.5 L2.5 11 Z" fill={color} stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
      <path d="M-14 -3 Q0 4 14 -3 L13.5 1 Q0 8.5 -13.5 1 Z" fill={color} stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
      <path d="M-13 -0.6 Q0 6.4 13 -0.6" fill="none" stroke="#ffffff" strokeWidth={1} opacity={0.9} />
      <ellipse cx={0} cy={3.2} rx={3.4} ry={2.9} fill={color} stroke={INK} strokeWidth={1.3} />
    </g>
  )
}
