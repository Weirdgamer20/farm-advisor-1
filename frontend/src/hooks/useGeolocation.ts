import { useState, useCallback } from 'react'

export type GeoState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; latitude: number; longitude: number; source?: 'gps' | 'ip' | 'preset' }
  | { status: 'error'; message: string }

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: 'idle' })

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      // Try IP lookup fallback
      fallbackToIp('Geolocation is not supported by your browser.')
      return
    }

    setState({ status: 'loading' })

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: 'success',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          source: 'gps',
        })
      },
      async (err) => {
        const msgs: Record<number, string> = {
          1: 'Location permission was denied in your browser.',
          2: 'Location information is unavailable on your device.',
          3: 'Location request timed out.',
        }
        const reason = msgs[err.code] ?? 'Unable to retrieve location.'
        // Automatically try IP-based geolocation fallback so farmer is not blocked
        await fallbackToIp(reason)
      },
      { timeout: 7000, maximumAge: 60000, enableHighAccuracy: false },
    )
  }, [])

  const setManualLocation = useCallback((latitude: number, longitude: number) => {
    setState({
      status: 'success',
      latitude,
      longitude,
      source: 'preset',
    })
  }, [])

  async function fallbackToIp(previousErrorMsg: string) {
    try {
      const res = await fetch('https://get.geojs.io/v1/ip/geo.json')
      if (res.ok) {
        const data = await res.json()
        const lat = parseFloat(data.latitude)
        const lon = parseFloat(data.longitude)
        if (!isNaN(lat) && !isNaN(lon)) {
          setState({
            status: 'success',
            latitude: lat,
            longitude: lon,
            source: 'ip',
          })
          return
        }
      }
    } catch {
      // Ignore network errors on IP fallback
    }

    setState({
      status: 'error',
      message: `${previousErrorMsg} You can allow location access in your browser or continue with manual coordinates.`,
    })
  }

  return { state, request, setManualLocation }
}
