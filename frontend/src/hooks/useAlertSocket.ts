import { useEffect, useRef } from 'react'
import { API_BASE_URL } from '../api/client'

export default function useAlertSocket(onAlert: (alert: any) => void) {
  const callback = useRef(onAlert)
  callback.current = onAlert

  useEffect(() => {
    const websocketUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws/alerts'
    let socket: WebSocket | null = null
    let timer: number | undefined
    let stopped = false
    let attempts = 0

    const connect = () => {
      if (stopped) return
      socket = new WebSocket(websocketUrl)
      socket.onopen = () => { attempts = 0 }
      socket.onmessage = (event) => {
        try { callback.current(JSON.parse(event.data)) } catch { /* ignore malformed messages */ }
      }
      socket.onclose = () => {
        if (stopped || attempts >= 5) return
        attempts += 1
        timer = window.setTimeout(connect, Math.min(1000 * 2 ** attempts, 10000))
      }
      socket.onerror = () => socket?.close()
    }

    connect()
    return () => {
      stopped = true
      if (timer) window.clearTimeout(timer)
      socket?.close()
    }
  }, [])
}
