import { useState, useCallback } from 'react'

export type GeoState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; latitude: number; longitude: number }
  | { status: 'error'; message: string }

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: 'idle' })

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: 'error', message: 'Geolocation is not supported by your browser.' })
      return
    }
    setState({ status: 'loading' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: 'success',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: 'Location permission was denied. Please allow location access and try again.',
          2: 'Location information is unavailable. Please check your device settings.',
          3: 'Location request timed out. Please try again.',
        }
        setState({ status: 'error', message: msgs[err.code] ?? 'An unknown location error occurred.' })
      },
      { timeout: 10000, maximumAge: 30000 },
    )
  }, [])

  return { state, request }
}
