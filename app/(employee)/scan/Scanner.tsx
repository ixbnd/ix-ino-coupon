'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface DetectedBarcode {
  rawValue: string
}

interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}

interface BarcodeDetectorConstructor {
  new (options: { formats: string[] }): BarcodeDetectorInstance
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor
  }
}

const SCAN_REGION_ID = 'qr-scan-region'
const NO_CAMERA_MESSAGE = 'Allow camera access, or scan the poster with your camera app.'

type Mode = 'pending' | 'native' | 'library' | 'unavailable'

export function Scanner() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [mode, setMode] = useState<Mode>('pending')
  const [hint, setHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    let rafId: number | null = null
    let html5Qrcode: import('html5-qrcode').Html5Qrcode | null = null
    // Captured once the dynamic import resolves, so stopLibraryInstance() can check
    // real library state instead of guessing — see stopLibraryInstance() below.
    let qrcodeStateEnum: typeof import('html5-qrcode').Html5QrcodeScannerState | null = null

    // html5-qrcode's stop() throws SYNCHRONOUSLY ("Cannot stop, scanner is not
    // running or paused.") when the instance is still NOT_STARTED — which is the
    // case for the whole time start()'s camera-acquisition promise is in flight,
    // and forever if start() rejects (permission denied / no camera). Its clear()
    // does the mirror-image thing: it throws unless the instance IS NOT_STARTED.
    // So the two calls are only ever safe in this order, gated by state:
    //   - state === NOT_STARTED  -> clear() only (stop() would throw)
    //   - state !== NOT_STARTED  -> stop() then clear() in .finally()
    // Every branch is additionally wrapped in try/catch as defense in depth
    // against a state flip racing the check itself.
    function stopLibraryInstance(instance: import('html5-qrcode').Html5Qrcode) {
      const notStarted = qrcodeStateEnum?.NOT_STARTED
      let state: number | undefined
      try {
        state = instance.getState()
      } catch {
        state = undefined
      }
      const isActive = state !== undefined && state !== notStarted

      const safeClear = () => {
        try {
          instance.clear()
        } catch {
          // Element may already be gone, or state shifted underneath us — nothing
          // left to tear down either way.
        }
      }

      if (!isActive) {
        safeClear()
        return
      }
      try {
        instance.stop().catch(() => {}).finally(safeClear)
      } catch {
        // stop() itself can still throw synchronously if state flips between the
        // getState() check above and this call.
        safeClear()
      }
    }

    function cleanup() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        stream = null
      }
      if (html5Qrcode) {
        const instance = html5Qrcode
        html5Qrcode = null
        stopLibraryInstance(instance)
      }
    }

    function handleDecoded(text: string) {
      if (cancelled) return
      let url: URL
      try {
        url = new URL(text, window.location.origin)
      } catch {
        setHint('Not a coupon code.')
        return
      }
      if (url.origin !== window.location.origin || url.pathname !== '/claim') {
        setHint('Not a coupon code.')
        return
      }
      setHint(null)
      cancelled = true
      cleanup()
      router.push(url.pathname + url.search)
    }

    async function startNative(Detector: BarcodeDetectorConstructor) {
      const detector = new Detector({ formats: ['qr_code'] })
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop())
        stream = null
        return
      }
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      if (cancelled) return
      setMode('native')

      const tick = async () => {
        if (cancelled) return
        try {
          const barcodes = await detector.detect(video)
          if (barcodes.length > 0) {
            handleDecoded(barcodes[0].rawValue)
            if (cancelled) return
          }
        } catch {
          // transient decode error — keep scanning
        }
        rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
    }

    async function startLibrary() {
      const mod = await import('html5-qrcode')
      qrcodeStateEnum = mod.Html5QrcodeScannerState
      if (cancelled) return
      const instance = new mod.Html5Qrcode(SCAN_REGION_ID)
      html5Qrcode = instance
      setMode('library')
      await instance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => handleDecoded(decodedText),
        () => {},
      )
      // start() has now resolved and the instance is SCANNING. If we were torn
      // down while start() was still in flight, the cleanup() call above already
      // ran and found the instance NOT_STARTED (so it only cleared, correctly
      // skipping stop() to avoid the synchronous throw) — meaning the camera
      // that just finished starting is still live with nothing to stop it.
      // Finish that teardown now that stop() is actually safe to call.
      if (cancelled) {
        html5Qrcode = null
        stopLibraryInstance(instance)
      }
    }

    async function start() {
      try {
        if (typeof window !== 'undefined' && window.BarcodeDetector) {
          await startNative(window.BarcodeDetector)
        } else {
          await startLibrary()
        }
      } catch {
        if (cancelled) return
        setMode('unavailable')
        setError(NO_CAMERA_MESSAGE)
      }
    }

    start()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [router])

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-900">
        <video
          ref={videoRef}
          className={mode === 'native' ? 'h-full w-full object-cover' : 'hidden'}
          muted
          playsInline
        />
        {/* Always mounted (even off-mode) so html5-qrcode finds the element by id when it initializes. */}
        <div id={SCAN_REGION_ID} className={mode === 'library' ? 'h-full w-full' : 'hidden'} />
      </div>
      {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {hint ? <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
    </div>
  )
}
