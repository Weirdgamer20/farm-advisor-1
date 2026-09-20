import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface SoilGaugeProps {
  score: number
  label: string
}

const LABEL_CONFIG = {
  good:              { color: '#22c55e', bg: '#052e16', ring: '#15803d', text: 'Good' },
  acceptable:        { color: '#eab308', bg: '#422006', ring: '#a16207', text: 'Acceptable' },
  needs_attention:   { color: '#f97316', bg: '#431407', ring: '#c2410c', text: 'Needs Attention' },
  poor:              { color: '#ef4444', bg: '#450a0a', ring: '#b91c1c', text: 'Poor' },
}

export default function SoilGauge({ score, label }: SoilGaugeProps) {
  const cfg = LABEL_CONFIG[label as keyof typeof LABEL_CONFIG] ?? LABEL_CONFIG.acceptable

  // SVG arc: semi-circle from 180° to 0°
  const R = 70
  const cx = 90
  const cy = 90
  const circumference = Math.PI * R  // half circle
  const fillLength = (score / 100) * circumference
  const dashoffset = circumference - fillLength

  const Icon = score >= 80 ? TrendingUp : score >= 40 ? Minus : TrendingDown

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 180, height: 100 }}>
        {/* Background track */}
        <svg width="180" height="100" viewBox="0 0 180 100" className="overflow-visible">
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none"
            stroke="#1c2a1e"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none"
            stroke={cfg.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={dashoffset}
            className="gauge-arc"
            style={{ filter: `drop-shadow(0 0 6px ${cfg.color}60)` }}
          />
        </svg>

        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span
            className="text-3xl font-display font-bold leading-none"
            style={{ color: cfg.color }}
          >
            {Math.round(score)}
          </span>
          <span className="text-xs text-gray-500 font-medium">/100</span>
        </div>
      </div>

      {/* Label badge */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border"
        style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.ring + '60' }}
      >
        <Icon className="w-3.5 h-3.5" />
        {cfg.text}
      </div>
    </div>
  )
}
