/**
 * Typed API client for the Farmer Crop Advisory backend.
 * Local development uses Vite's /api proxy; production uses VITE_API_URL.
 */

const BASE = `${import.meta.env.VITE_API_URL || '/api'}/v1`

export interface AdvisoryRequest {
  latitude: number
  longitude: number
  crop: string
  soil_type?: string
}

export interface WeatherInfo {
  temperature: number
  apparent_temperature?: number
  humidity: number
  rainfall_mm: number
  rainfall_observed_7d?: number
  rainfall_forecast_7d?: number
  wind_speed_kmh?: number
  condition: string
  location_name?: string
  source: 'live' | 'fallback'
}

export interface DetectedSoilInfo {
  soil_type: string
  soil_name: string
  description?: string
  typical_ph?: number
  drainage?: string
  confidence?: number
  source?: string
}

export interface Recommendation {
  crop: string
  suitability_score: number
  suitability_label: 'good' | 'acceptable' | 'needs_attention' | 'poor'
  confidence: number
}

export interface AdvisoryResponse {
  request_id: string
  location: { latitude: number; longitude: number; region?: string }
  weather: WeatherInfo
  detected_soil: DetectedSoilInfo
  recommendation: Recommendation
  explanation: string[]
  soil_profile?: Record<string, unknown>
}

export interface DiseaseResponse {
  request_id: string
  disease: string
  confidence: number
  is_healthy: boolean
  crop?: string
  condition?: string
  treatment_hint?: string
  model_version: string
  status: 'success' | 'low_confidence'
}

export interface ChatResponse {
  answer: string
  provider: string
  available: boolean
}

export interface ChatContext {
  crop?: string
  soil_type?: string
  latitude?: number
  longitude?: number
  temperature?: number
  humidity?: number
  rainfall_mm?: number
  suitability_score?: number
  suitability_label?: string
  disease?: string
  disease_confidence?: number
  explanation?: string[]
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err?.detail?.message ?? err?.detail ?? `API error ${res.status}`)
  }
  return res.json()
}

export async function fetchAdvisory(req: AdvisoryRequest): Promise<AdvisoryResponse> {
  return apiPost('/advisory', req)
}

export async function fetchDetectedSoil(lat: number, lon: number): Promise<{ latitude: number; longitude: number; soil: DetectedSoilInfo }> {
  const res = await fetch(`${BASE}/soil/detect?latitude=${lat}&longitude=${lon}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Soil detection failed' }))
    throw new Error(err?.detail?.message ?? err?.detail ?? 'Failed to detect soil')
  }
  return res.json()
}

export async function fetchDiseasePredict(file: File): Promise<DiseaseResponse> {
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${BASE}/disease/predict`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err?.detail?.message ?? err?.detail ?? `API error ${res.status}`)
  }
  return res.json()
}

export async function fetchChat(
  message: string,
  context: ChatContext,
  history: { role: string; content: string }[],
): Promise<ChatResponse> {
  return apiPost('/chat', { message, context, history })
}

export async function fetchHealth(): Promise<{ status: string; models: Record<string, boolean> }> {
  const res = await fetch(`${BASE}/health`)
  return res.json()
}
