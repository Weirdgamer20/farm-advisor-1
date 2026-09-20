import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2, AlertCircle, Leaf, Sprout, Sparkles, MapPin, CheckCircle2 } from 'lucide-react'
import { fetchAdvisory, fetchDetectedSoil } from '../api/client'
import type { AdvisoryResponse, DetectedSoilInfo } from '../api/client'
import AdvisoryCard from '../components/AdvisoryCard'
import Chatbot from '../components/Chatbot'

const CROPS = [
  { value: 'apple',       label: 'Apple',       emoji: '🍎' },
  { value: 'bell_pepper', label: 'Bell Pepper',  emoji: '🫑' },
  { value: 'cherry',      label: 'Cherry',       emoji: '🍒' },
  { value: 'grapes',      label: 'Grapes',       emoji: '🍇' },
  { value: 'maize',       label: 'Maize',        emoji: '🌽' },
  { value: 'peach',       label: 'Peach',        emoji: '🍑' },
  { value: 'potato',      label: 'Potato',       emoji: '🥔' },
  { value: 'strawberry',  label: 'Strawberry',   emoji: '🍓' },
  { value: 'tomato',      label: 'Tomato',       emoji: '🍅' },
]

export default function Advisory() {
  const location = useLocation()
  const gps = location.state as { latitude: number; longitude: number } | null

  // Coordinates
  const [manualLat, setManualLat] = useState(gps ? '' : '18.5204')
  const [manualLon, setManualLon] = useState(gps ? '' : '73.8567')
  const lat = gps?.latitude ?? parseFloat(manualLat)
  const lon = gps?.longitude ?? parseFloat(manualLon)

  // Soil auto-detection (100% automatic — farmers never need to pick soil)
  const [detectedSoil, setDetectedSoil] = useState<DetectedSoilInfo | null>(null)
  const [soilLoading, setSoilLoading] = useState(false)

  // Crop & execution state
  const [crop, setCrop] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null)

  // Trigger soil detection whenever coordinates change
  useEffect(() => {
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      let isCurrent = true
      setSoilLoading(true)
      fetchDetectedSoil(lat, lon)
        .then((res) => {
          if (isCurrent) {
            setDetectedSoil(res.soil)
            setError(null)
          }
        })
        .catch(() => {
          // Gracefully handled by backend fallback
        })
        .finally(() => {
          if (isCurrent) setSoilLoading(false)
        })
      return () => {
        isCurrent = false
      }
    }
  }, [lat, lon])

  // Can submit as long as coordinates are valid and a crop is selected
  const canSubmit = crop && !isNaN(lat) && !isNaN(lon)

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    setAdvisory(null)
    try {
      const result = await fetchAdvisory({
        latitude: lat,
        longitude: lon,
        crop,
      })
      setAdvisory(result)
    } catch (e: any) {
      setError(e.message ?? 'Failed to generate advisory. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const activeSoil = detectedSoil?.soil_type || 'loamy'

  const chatContext = advisory
    ? {
        crop: advisory.recommendation.crop,
        soil_type: advisory.detected_soil.soil_type,
        latitude: lat,
        longitude: lon,
        temperature: advisory.weather.temperature,
        humidity: advisory.weather.humidity,
        rainfall_mm: advisory.weather.rainfall_mm,
        suitability_score: advisory.recommendation.suitability_score,
        suitability_label: advisory.recommendation.suitability_label,
        explanation: advisory.explanation,
      }
    : { crop, soil_type: activeSoil }

  return (
    <main className="min-h-screen pt-24 pb-24 px-4 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="label-text mb-1">AI Crop Advisory</p>
        <h1 className="section-title flex items-center gap-3">
          <Leaf className="w-7 h-7 text-forest-500" />
          Smart Farm Advisory
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          Soil texture and real-time weather are automatically detected from your farm's location.
          Simply select your intended crop to generate an agronomic recommendation.
        </p>
      </div>

      {/* Location Bar / GPS */}
      <div className="glass-card p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-forest-400 flex-shrink-0" />
            <h2 className="text-sm font-semibold text-white">Farm Geographic Location</h2>
          </div>
          {gps && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-forest-900/60 text-forest-300 border border-forest-600/40 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-forest-400 animate-pulse" />
              Live GPS Locked
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text text-xs block mb-1">Latitude</label>
            <input
              type="number"
              id="manual-lat"
              step="any"
              placeholder="e.g. 18.5204"
              value={gps ? gps.latitude.toFixed(4) : manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              disabled={!!gps}
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="label-text text-xs block mb-1">Longitude</label>
            <input
              type="number"
              id="manual-lon"
              step="any"
              placeholder="e.g. 73.8567"
              value={gps ? gps.longitude.toFixed(4) : manualLon}
              onChange={(e) => setManualLon(e.target.value)}
              disabled={!!gps}
              className="input-field text-sm"
            />
          </div>
        </div>

        {/* Quick Demo Location chips if no GPS */}
        {!gps && (
          <div className="mt-3 pt-3 border-t border-dark-600/60 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-400">Quick presets:</span>
            <button
              type="button"
              onClick={() => { setManualLat('18.5204'); setManualLon('73.8567') }}
              className="px-2 py-1 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-300 transition"
            >
              Maharashtra (Black Soil)
            </button>
            <button
              type="button"
              onClick={() => { setManualLat('30.7333'); setManualLon('76.7794') }}
              className="px-2 py-1 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-300 transition"
            >
              Punjab (Alluvial Loam)
            </button>
            <button
              type="button"
              onClick={() => { setManualLat('26.9124'); setManualLon('75.7873') }}
              className="px-2 py-1 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-300 transition"
            >
              Rajasthan (Sandy)
            </button>
          </div>
        )}
      </div>

      {/* AI Soil Intelligence Card (Auto-detected) */}
      <div className="glass-card p-5 mb-6 border-forest-800/40 border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-forest-900/80 border border-forest-600/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-forest-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Automated Soil Intelligence
                {soilLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-forest-400" />}
              </h2>
              <p className="text-[11px] text-gray-400">Satellite geospatial & agro-ecological resolution for your coordinates</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-forest-900/80 text-forest-300 text-xs border border-forest-700/50 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-forest-400" />
            100% Automatic
          </span>
        </div>

        <div className="bg-dark-900/60 rounded-xl p-4 border border-dark-600/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-emerald-300">
                  {detectedSoil?.soil_name || 'Analyzing soil profile...'}
                </span>
                {detectedSoil && (
                  <span className="px-2 py-0.5 rounded-full bg-forest-900/80 text-forest-300 text-[11px] border border-forest-700/50">
                    USDA: {detectedSoil.soil_type.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {detectedSoil?.description || 'Determining soil texture and geological drainage automatically...'}
              </p>
            </div>
            {detectedSoil && (
              <div className="flex items-center gap-2 sm:text-right flex-shrink-0">
                {detectedSoil.typical_ph && (
                  <div className="px-3 py-1.5 rounded-lg bg-dark-700/80 border border-dark-600 text-xs text-gray-200">
                    <span className="text-gray-400">Typical pH:</span> <strong className="text-emerald-400">{detectedSoil.typical_ph}</strong>
                  </div>
                )}
                {detectedSoil.drainage && (
                  <div className="px-3 py-1.5 rounded-lg bg-dark-700/80 border border-dark-600 text-xs text-gray-300 max-w-[200px] text-left truncate">
                    {detectedSoil.drainage}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Crop selection */}
      <div className="glass-card p-5 mb-6">
        <h2 className="font-semibold text-white mb-2 flex items-center gap-2">
          <Sprout className="w-4 h-4 text-forest-400" /> Select Crop to Cultivate
        </h2>
        <p className="text-xs text-gray-400 mb-4">Choose the crop you plan to plant or evaluate for suitability:</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {CROPS.map((c) => (
            <button
              key={c.value}
              id={`crop-${c.value}`}
              onClick={() => setCrop(c.value)}
              className={`p-3.5 rounded-xl border text-center transition-all duration-200 ${
                crop === c.value
                  ? 'border-forest-500 bg-forest-900/60 ring-1 ring-forest-500 shadow-lg shadow-forest-950/40'
                  : 'border-dark-500/60 hover:border-dark-400/80 bg-dark-700/40'
              }`}
            >
              <div className="text-2xl mb-1">{c.emoji}</div>
              <p className="text-xs font-medium text-gray-200 leading-tight">{c.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 text-red-400 text-sm mb-4 glass-card px-4 py-3 border-red-900/40 border">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        id="generate-advisory-btn"
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="btn-primary w-full flex items-center justify-center gap-2 mb-8 py-3.5 text-base font-semibold shadow-xl shadow-forest-950/50"
      >
        {loading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Soil & Meteorological Conditions…</>
        ) : (
          <><Leaf className="w-5 h-5" /> Generate Comprehensive Advisory</>
        )}
      </button>

      {/* Result presentation */}
      {advisory && <AdvisoryCard advisory={advisory} />}

      {/* Contextual Chatbot */}
      <Chatbot context={chatContext} />
    </main>
  )
}
