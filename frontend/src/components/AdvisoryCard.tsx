import { Cloud, Droplets, Thermometer, Wifi, WifiOff, Wind, Sprout, MapPin, Gauge } from 'lucide-react'
import type { AdvisoryResponse } from '../api/client'
import SoilGauge from './SoilGauge'

interface AdvisoryCardProps {
  advisory: AdvisoryResponse
}

const CROP_EMOJI: Record<string, string> = {
  apple: '🍎', bell_pepper: '🫑', cherry: '🍒', grapes: '🍇',
  maize: '🌽', peach: '🍑', potato: '🥔', strawberry: '🍓', tomato: '🍅',
}

export default function AdvisoryCard({ advisory }: AdvisoryCardProps) {
  const { weather, recommendation, explanation, location, detected_soil } = advisory
  const emoji = CROP_EMOJI[recommendation.crop] ?? '🌱'
  const conf = Math.round(recommendation.confidence * 100)

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="text-5xl">{emoji}</div>
          <div className="flex-1">
            <p className="label-text mb-1">Advisory for</p>
            <h2 className="font-display text-3xl font-bold text-white capitalize">
              {recommendation.crop}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-400">
              <span className="flex items-center gap-1 text-forest-300 font-medium">
                <MapPin className="w-3.5 h-3.5 text-forest-400" />
                {weather.location_name || `${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°`}
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400 text-xs">
                ({location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°)
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <SoilGauge
              score={recommendation.suitability_score}
              label={recommendation.suitability_label}
            />
          </div>
        </div>

        {/* Auto-detected soil badge */}
        {detected_soil && (
          <div className="mt-4 pt-4 border-t border-dark-600/60 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-400">Soil Condition:</span>
              <span className="font-semibold text-emerald-300">{detected_soil.soil_name}</span>
              {detected_soil.typical_ph && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-dark-600 text-gray-300">
                  pH {detected_soil.typical_ph}
                </span>
              )}
            </div>
            {detected_soil.drainage && (
              <span className="text-xs text-gray-400 italic">
                {detected_soil.drainage}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Weather + Confidence metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <MetricCard
          icon={<Thermometer className="w-4 h-4 text-orange-400" />}
          label="Temperature"
          value={`${weather.temperature.toFixed(1)}°C`}
          subtext={weather.apparent_temperature !== undefined ? `Feels like ${weather.apparent_temperature.toFixed(1)}°C` : undefined}
        />
        <MetricCard
          icon={<Droplets className="w-4 h-4 text-sky-400" />}
          label="Humidity"
          value={`${weather.humidity.toFixed(1)}%`}
          subtext="Relative air moisture"
        />
        <MetricCard
          icon={<Cloud className="w-4 h-4 text-blue-400" />}
          label="7-Day Rainfall"
          value={weather.rainfall_observed_7d !== undefined ? `${weather.rainfall_observed_7d.toFixed(1)} mm` : `${weather.rainfall_mm.toFixed(1)} mm`}
          subtext={weather.rainfall_forecast_7d !== undefined ? `+${weather.rainfall_forecast_7d.toFixed(1)} mm next 7d` : undefined}
        />
        <MetricCard
          icon={<Wind className="w-4 h-4 text-teal-400" />}
          label="Wind Speed"
          value={weather.wind_speed_kmh !== undefined ? `${weather.wind_speed_kmh.toFixed(1)} km/h` : 'Calm'}
          subtext={weather.condition}
        />
        <div className="glass-card p-4 col-span-2 sm:col-span-1 md:col-span-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            {weather.source === 'live'
              ? <Wifi className="w-3.5 h-3.5 text-forest-400" />
              : <WifiOff className="w-3.5 h-3.5 text-gray-500" />}
            <span className="label-text text-xs">AI Confidence</span>
          </div>
          <div className="text-xl font-bold text-white">{conf}%</div>
          <div className="mt-2 h-1.5 rounded-full bg-dark-500 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-forest-600 to-forest-400 confidence-bar-fill"
              style={{ width: `${conf}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {weather.source === 'live' ? 'Live satellite weather' : 'Regional climate baseline'}
          </p>
        </div>
      </div>

      {/* Explanation */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-forest-500 inline-block" />
          Why this recommendation?
        </h3>
        <ul className="space-y-2.5">
          {explanation.map((line, i) => (
            <li key={i} className="text-sm text-gray-300 leading-relaxed pl-3 border-l border-dark-500">
              <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-forest-300">$1</strong>') }} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtext?: string
}) {
  return (
    <div className="glass-card p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          {icon}
          <span className="label-text text-xs">{label}</span>
        </div>
        <div className="text-xl font-bold text-white">{value}</div>
      </div>
      {subtext && <p className="text-[11px] text-gray-400 mt-1">{subtext}</p>}
    </div>
  )
}
