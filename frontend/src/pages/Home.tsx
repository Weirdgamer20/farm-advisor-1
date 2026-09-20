import { useNavigate } from 'react-router-dom'
import { MapPin, Leaf, Microscope, Bot, ChevronRight, AlertCircle, Loader2, Sprout } from 'lucide-react'
import { useGeolocation } from '../hooks/useGeolocation'

export default function Home() {
  const { state, request } = useGeolocation()
  const navigate = useNavigate()

  const handleContinue = () => {
    if (state.status === 'success') {
      navigate('/advisory', {
        state: { latitude: state.latitude, longitude: state.longitude },
      })
    }
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
          <div className="glass-card max-w-sm mx-auto p-6 text-left">
            <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-forest-400" />
              Step 1 — Allow location access
            </p>

            {state.status === 'idle' && (
              <button id="gps-request-btn" onClick={request} className="btn-primary w-full">
                <MapPin className="w-4 h-4 inline mr-2" />
                Share My Location
              </button>
            )}

            {state.status === 'loading' && (
              <div className="flex items-center gap-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin text-forest-400" />
                Requesting location…
              </div>
            )}

            {state.status === 'error' && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {state.message}
                </div>
                <button onClick={request} className="btn-secondary w-full text-sm">
                  Try Again
                </button>
              </div>
            )}

            {state.status === 'success' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-forest-400 text-sm">
                  <div className="w-2 h-2 rounded-full bg-forest-400 animate-pulse" />
                  Location captured ✓
                </div>
                <p className="text-xs text-gray-500">
                  {state.latitude.toFixed(5)}°N, {state.longitude.toFixed(5)}°E
                </p>
                <button
                  id="continue-to-advisory"
                  onClick={handleContinue}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  Get My Crop Advisory
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
