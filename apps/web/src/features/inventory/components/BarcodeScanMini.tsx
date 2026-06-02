'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { X, ScanLine, Keyboard, ZapOff } from 'lucide-react'

interface Props {
  onDetected: (code: string) => void
  onClose:    () => void
}

export function BarcodeScanMini({ onDetected, onClose }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const lastCodeRef = useRef('')
  const doneRef     = useRef(false)

  const [mode,        setMode]        = useState<'scan' | 'manual' | 'error'>('scan')
  const [manualVal,   setManualVal]   = useState('')
  const [errorReason, setErrorReason] = useState('')
  const [starting,    setStarting]    = useState(true)

  /* ── Stop ─────────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    try { controlsRef.current?.stop() } catch { /* ignore */ }
    controlsRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  /* ── Start camera + ZXing ────────────────────────── */
  const startCamera = useCallback(async () => {
    setStarting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) { stream.getTracks().forEach(t => t.stop()); return }
      video.srcObject = stream
      await video.play()

      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const { DecodeHintType, BarcodeFormat } = await import('@zxing/library')

      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      ])

      const reader = new BrowserMultiFormatReader(hints)

      const controls = await reader.decodeFromVideoElement(video, (result) => {
        if (!result || doneRef.current) return
        const code = result.getText()
        if (!code || code === lastCodeRef.current) return
        lastCodeRef.current = code
        doneRef.current = true
        if ('vibrate' in navigator) navigator.vibrate([60, 30, 60])
        controls?.stop()
        onDetected(code)
      })
      controlsRef.current = controls

    } catch (err: any) {
      setMode('error')
      setErrorReason(err?.name === 'NotAllowedError' ? 'camera_denied' : 'no_camera')
    } finally {
      setStarting(false)
    }
  }, [onDetected])

  useEffect(() => {
    if (mode === 'scan') startCamera()
    return () => stopCamera()
  }, [mode])

  const handleClose = () => { stopCamera(); onClose() }

  const handleManualConfirm = () => {
    const code = manualVal.trim()
    if (!code) return
    stopCamera()
    onDetected(code)
  }

  /* ─────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 px-4"
      onClick={handleClose}
      aria-hidden="true"
    >
      <div
        className="w-full max-w-sm bg-slate-900 rounded-2xl overflow-hidden shadow-pop animate-sheet-up"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-white">
            <ScanLine size={16} strokeWidth={2.25} className="text-primary-400" />
            <span className="text-[14px] font-bold">ស្កែន Barcode</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { stopCamera(); setMode(m => m === 'manual' ? 'scan' : 'manual') }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 active:bg-slate-600"
            >
              <Keyboard size={13} />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 active:bg-slate-600"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Camera */}
        {mode === 'scan' && (
          <div className="relative bg-black overflow-hidden" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />

            {/* Corner brackets */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-48 h-32">
                <span className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-primary-400 rounded-tl-md" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-primary-400 rounded-tr-md" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-primary-400 rounded-bl-md" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-primary-400 rounded-br-md" />
                <div className="absolute inset-x-2 top-1/2 h-0.5 bg-primary-400/80 rounded-full animate-pulse" />
              </div>
            </div>

            {starting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white text-[12px] bg-black/70 px-3 py-1.5 rounded-full">
                  កំពុងបើក Camera…
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {mode === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 px-4 gap-3">
            <ZapOff size={32} className="text-slate-500" />
            <p className="text-white text-[13px] font-semibold text-center">
              {errorReason === 'camera_denied' ? 'មិនអនុញ្ញាតប្រើ Camera' : 'រក Camera មិនឃើញ'}
            </p>
            <p className="text-slate-400 text-[11px] text-center leading-relaxed">
              {errorReason === 'camera_denied'
                ? 'ចូល Settings › Safari › Camera ហើយ Allow'
                : 'សូមប្រើ Manual Input ខាងក្រោម'}
            </p>
          </div>
        )}

        {/* Bottom */}
        <div className="px-4 py-4 space-y-3">
          {mode === 'scan' && !starting && (
            <p className="text-center text-[11px] text-slate-400">
              ដាក់ Barcode ចំពោះ Frame
            </p>
          )}

          {(mode === 'manual' || mode === 'error') && (
            <div>
              <p className="text-[11px] text-slate-400 mb-2">វាយ Barcode ដៃ</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualVal}
                  onChange={e => setManualVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualConfirm()}
                  placeholder="8851234567890"
                  autoFocus
                  className="flex-1 h-10 rounded-xl bg-slate-700 border border-slate-600 text-white px-3 text-[13px] font-mono placeholder:text-slate-500 focus:outline-none focus:border-primary-500"
                />
                <button
                  type="button"
                  disabled={!manualVal.trim()}
                  onClick={handleManualConfirm}
                  className="h-10 px-4 rounded-xl bg-primary-600 text-white font-bold text-[13px] disabled:opacity-40 active:bg-primary-700"
                >
                  យក
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
