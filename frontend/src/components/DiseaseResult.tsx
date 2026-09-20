import { CheckCircle, AlertTriangle, Stethoscope } from 'lucide-react'
import type { DiseaseResponse } from '../api/client'

interface DiseaseResultProps {
  result: DiseaseResponse
  previewUrl: string | null
}

export default function DiseaseResult({ result, previewUrl }: DiseaseResultProps) {
  const conf = Math.round(result.confidence * 100)
  const isHealthy = result.is_healthy
  const lowConf = result.status === 'low_confidence'

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="glass-card overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image preview */}
          {previewUrl && (
            <div className="relative h-56 md:h-auto bg-dark-800">
              <img
                src={previewUrl}
                alt="Uploaded leaf"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900/60 to-transparent" />
            </div>
          )}

          {/* Result info */}
          <div className="p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {isHealthy ? (
                  <CheckCircle className="w-5 h-5 text-forest-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                )}
                <span className={`text-sm font-semibold ${isHealthy ? 'text-forest-400' : 'text-orange-400'}`}>
                  {isHealthy ? 'Healthy Plant' : 'Disease Detected'}
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-white leading-snug">
                {result.disease}
              </h3>

              {result.crop && (
                <p className="text-sm text-gray-400 mt-1">
                  Crop: <span className="text-gray-300 capitalize">{result.crop}</span>
                </p>
              )}
            </div>

            {/* Confidence */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Model Confidence</span>
                <span className={conf >= 70 ? 'text-forest-400' : 'text-yellow-500'}>{conf}%</span>
              </div>
              <div className="h-2 rounded-full bg-dark-500 overflow-hidden">
                <div
                  className={`h-full rounded-full confidence-bar-fill transition-all
                    ${conf >= 70 ? 'bg-gradient-to-r from-forest-600 to-forest-400'
                    : 'bg-gradient-to-r from-yellow-700 to-yellow-500'}`}
                  style={{ width: `${conf}%` }}
                />
              </div>
              {lowConf && (
                <p className="text-xs text-yellow-500/80 mt-1.5">
                  ⚠ Low confidence — image quality may affect accuracy
                </p>
              )}
            </div>

            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5" />
              {result.model_version}
            </div>
          </div>
        </div>
      </div>

      {/* Treatment hint */}
      {result.treatment_hint && !isHealthy && (
        <div className="glass-card p-5 border-l-4 border-orange-600/60">
          <h4 className="font-semibold text-orange-300 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Treatment Guidance
          </h4>
          <p className="text-sm text-gray-300 leading-relaxed">{result.treatment_hint}</p>
          <p className="text-xs text-gray-500 mt-3 italic">
            This is a model-based suggestion. Consult a local agricultural expert before applying any treatment.
          </p>
        </div>
      )}

      {isHealthy && (
        <div className="glass-card p-4 border-l-4 border-forest-600/60">
          <div className="flex items-center gap-2 text-forest-300">
            <CheckCircle className="w-4 h-4" />
            <p className="text-sm font-medium">
              No disease detected. Continue regular monitoring and care.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
