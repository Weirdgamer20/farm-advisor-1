import { useNavigate } from 'react-router-dom'
import { MapPin, Leaf, Microscope, Bot, ChevronRight, AlertCircle, Loader2, Sprout, Globe, Navigation } from 'lucide-react'
import { useGeolocation } from '../hooks/useGeolocation'

export default function Home() {
  const { state, request, setManualLocation } = useGeolocation()
  const navigate = useNavigate()

  const handleContinue = () => {
    if (state.status === 'success') {
      navigate('/advisory', {
        state: { latitude: state.latitude, longitude: state.longitude },
      })
    }
  }

  const handleManualSkip = (lat = 18.5204, lon = 73.8567) => {
    navigate('/advisory', {
      state: { latitude: lat, longitude: lon },
    })
  }

  const steps = [
    { icon: MapPin,    label: 'Locate',   desc: 'Share your GPS location' },
    { icon: Leaf,      label: 'Advise',   desc: 'Get AI crop recommendations' },
    { icon: Microscope,label: 'Detect',   desc: 'Diagnose plant diseases' },
    { icon: Bot,       label: 'Chat',     desc: 'Ask the AI assistant' },
  ]

  return (
    <main className="min-h-screen pt-16 bg-hero-pattern">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 sm:py-32 text-center">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px]
                          bg-forest-700/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                          bg-forest-900/60 border border-forest-700/40 text-forest-300 text-sm font-medium mb-8">
            <Sprout className="w-3.5 h-3.5" />
            AI-Powered Agricultural Advisory
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-white leading-tight mb-6">
            Smarter Farming,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-400 to-forest-300">
              Powered by AI
            </span>
          </h1>

          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Get personalized crop recommendations, detect plant diseases from photos,
            and chat with your AI farming assistant — all from your phone or browser.
          </p>

          {/* GPS CTA */}
          <div className="glass-card max-w-sm mx-auto p-6 text-left shadow-2xl">
            <p className="text-sm text-gray-400 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-forest-400" />
                Step 1 — Farm Location
              </span>
            </p>

            {state.status === 'idle' && (
              <div className="space-y-3">
                <button id="gps-request-btn" onClick={request} className="btn-primary w-full flex items-center justify-center gap-2">
                  <Navigation className="w-4 h-4" />
                  Allow & Share GPS Location
                </button>
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-dark-600"></div>
                  <span className="flex-shrink mx-2 text-[11px] text-gray-500 uppercase tracking-wider">or</span>
                  <div className="flex-grow border-t border-dark-600"></div>
                </div>
                <button
                  type="button"
                  onClick={() => handleManualSkip(18.5204, 73.8567)}
                  className="w-full text-xs text-gray-400 hover:text-forest-300 transition py-2 px-3 rounded-lg border border-dark-600 hover:border-forest-700/50 bg-dark-800/60 flex items-center justify-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Continue without GPS (Set Manually)
                </button>
              </div>
            )}

            {state.status === 'loading' && (
              <div className="flex flex-col items-center justify-center py-4 gap-3 text-gray-300 text-sm">
                <Loader2 className="w-6 h-6 animate-spin text-forest-400" />
                <span>Requesting browser permission…</span>
                <span className="text-xs text-gray-500 text-center">Please click &quot;Allow&quot; in the browser prompt</span>
              </div>
            )}

            {state.status === 'error' && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-amber-400/90 text-xs bg-amber-950/30 p-3 rounded-lg border border-amber-800/40">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
                  <div>
                    <p className="font-medium text-amber-300 mb-1">Location permission not granted</p>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      To enable GPS: Click the 🔒 lock/tune icon next to the URL in your address bar, set <strong>Location</strong> to <strong>Allow</strong>, and refresh.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={request} className="btn-secondary text-xs py-2">
                    Try GPS Again
                  </button>
                  <button
                    onClick={() => handleManualSkip(18.5204, 73.8567)}
                    className="btn-primary text-xs py-2"
                  >
                    Enter Manually →
                  </button>
                </div>
              </div>
            )}

            {state.status === 'success' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-forest-400 text-sm font-medium">
                    <div className="w-2 h-2 rounded-full bg-forest-400 animate-pulse" />
                    Location captured ✓
                  </div>
                  {state.source && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-forest-900/80 text-forest-300 border border-forest-700/50 uppercase">
                      {state.source}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono bg-dark-900/60 p-2 rounded-lg border border-dark-600">
                  {state.latitude.toFixed(4)}°N, {state.longitude.toFixed(4)}°E
                </p>
                <button
                  id="continue-to-advisory"
                  onClick={handleContinue}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  Continue to Crop Advisory
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-20 max-w-4xl mx-auto">
        <h2 className="section-title text-center mb-10">How It Works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map(({ icon: Icon, label, desc }, i) => (
            <div key={label} className="glass-card-hover p-5 text-center group">
              <div className="w-12 h-12 rounded-xl bg-forest-900/60 border border-forest-800/40
                              flex items-center justify-center mx-auto mb-3
                              group-hover:border-forest-600/60 transition-colors">
                <Icon className="w-5 h-5 text-forest-400" />
              </div>
              <div className="w-5 h-5 rounded-full bg-forest-900 border border-forest-700/40
                              flex items-center justify-center mx-auto mb-2">
                <span className="text-xs text-forest-400 font-bold">{i + 1}</span>
              </div>
              <p className="font-semibold text-white text-sm">{label}</p>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Crops supported */}
      <section className="px-4 pb-24 max-w-4xl mx-auto text-center">
        <p className="label-text mb-4">Supported Crops</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            ['🍎','Apple'],['🫑','Bell Pepper'],['🍒','Cherry'],
            ['🍇','Grapes'],['🌽','Maize'],['🍑','Peach'],
            ['🥔','Potato'],['🍓','Strawberry'],['🍅','Tomato'],
          ].map(([emoji, name]) => (
            <span key={name} className="px-3 py-1.5 rounded-full bg-dark-700 border border-dark-600 text-sm text-gray-300">
              {emoji} {name}
            </span>
          ))}
        </div>
      </section>
    </main>
  )
}
