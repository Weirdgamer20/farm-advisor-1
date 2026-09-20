import { useState, useCallback } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { Upload, ImageIcon, Loader2, AlertCircle, Microscope, X } from 'lucide-react'
import { fetchDiseasePredict } from '../api/client'
import type { DiseaseResponse } from '../api/client'
import DiseaseResult from '../components/DiseaseResult'
import Chatbot from '../components/Chatbot'

const ACCEPTED = { 'image/jpeg': [], 'image/png': [], 'image/webp': [] }
const MAX_SIZE = 10 * 1024 * 1024  // 10 MB

export default function Disease() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DiseaseResponse | null>(null)

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    if (rejected.length > 0) {
      const code = rejected[0]?.errors[0]?.code
      if (code === 'file-too-large') setError('Image is too large. Maximum size is 10 MB.')
      else if (code === 'file-invalid-type') setError('Only JPEG, PNG, and WebP images are supported.')
      else setError('Invalid file. Please choose a supported image.')
      return
    }
    if (accepted[0]) {
      const f = accepted[0]
      setFile(f)
      setPreview(URL.createObjectURL(f))
      setError(null)
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    multiple: false,
  })

  const clear = () => {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setResult(null)
    setError(null)
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetchDiseasePredict(file)
      setResult(res)
    } catch (e: any) {
      setError(e.message ?? 'Disease analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const chatContext = result
    ? { disease: result.disease, disease_confidence: result.confidence, crop: result.crop ?? undefined }
    : {}

  return (
    <main className="min-h-screen pt-24 pb-24 px-4 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="label-text mb-1">Disease Detection</p>
        <h1 className="section-title flex items-center gap-3">
          <Microscope className="w-7 h-7 text-forest-500" />
          Plant Disease Classifier
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          Upload a clear photo of an affected leaf or plant. The AI model will classify it from 29 disease categories.
        </p>
      </div>

      {/* Upload zone */}
      {!file ? (
        <div
          {...getRootProps()}
          id="disease-dropzone"
          className={`glass-card border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300
            ${isDragActive ? 'dropzone-active border-forest-400' : 'border-dark-500/60 hover:border-forest-700/60 hover:bg-dark-700/40'}`}
        >
          <input {...getInputProps()} id="disease-file-input" />
          <div className="w-14 h-14 rounded-2xl bg-forest-900/50 border border-forest-800/40
                          flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6 text-forest-400" />
          </div>
          <p className="text-gray-200 font-medium mb-1">
            {isDragActive ? 'Drop your image here' : 'Drag & drop a leaf photo'}
          </p>
          <p className="text-sm text-gray-500 mb-4">or click to browse</p>
          <div className="inline-flex items-center gap-2 text-xs text-gray-600 bg-dark-700 px-3 py-1.5 rounded-full border border-dark-600">
            <ImageIcon className="w-3 h-3" />
            JPEG · PNG · WebP · Max 10 MB
          </div>
        </div>
      ) : (
        /* Preview + controls */
        <div className="glass-card overflow-hidden mb-4">
          <div className="relative">
            <img
              src={preview!}
              alt="Selected leaf"
              className="w-full max-h-72 object-cover"
            />
            <button
              onClick={clear}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-dark-900/80 flex items-center
                         justify-center hover:bg-dark-700 transition-colors border border-dark-600"
              aria-label="Remove image"
            >
              <X className="w-4 h-4 text-gray-300" />
            </button>
          </div>
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-400 truncate">
              <span className="text-gray-200">{file.name}</span>
              <span className="ml-2 text-gray-600">({(file.size / 1024).toFixed(0)} KB)</span>
            </div>
            <button
              id="analyze-disease-btn"
              onClick={analyze}
              disabled={loading}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
                : <><Microscope className="w-4 h-4" /> Analyze</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-red-400 text-sm mb-4 glass-card px-4 py-3 border-red-900/40 border">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6">
          <DiseaseResult result={result} previewUrl={preview} />
        </div>
      )}

      {/* Supported classes info */}
      {!result && (
        <div className="mt-8 glass-card p-5">
          <p className="label-text mb-3">Detectable Conditions (29 classes)</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              'Apple Scab','Black Rot','Cedar Apple Rust',
              'Bacterial Spot','Powdery Mildew','Cercospora Leaf Spot',
              'Common Rust','Northern Leaf Blight','Esca (Black Measles)',
              'Leaf Blight','Early Blight','Late Blight',
              'Septoria Leaf Spot','Yellow Leaf Curl Virus','Leaf Scorch',
              '+ Healthy variants',
            ].map((c) => (
              <span key={c} className="px-2 py-0.5 rounded-full bg-dark-700 border border-dark-600 text-xs text-gray-400">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Chatbot (disease context) */}
      <Chatbot context={chatContext} />
    </main>
  )
}
