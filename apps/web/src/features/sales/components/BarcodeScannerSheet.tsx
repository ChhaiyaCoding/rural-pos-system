'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ScanLine, PackageSearch, ZapOff, Keyboard } from 'lucide-react'
import { db } from '@/db'
import { useSaleStore } from '@/store/sale.store'
import { formatKHR } from '@/lib/money'
import type { Product } from '@/types'
import type { TenantId } from '@/types/branded'

const DEMO_TENANT = 'tenant-demo' as TenantId

interface Props {
  onClose: () => void
}

type ScanState =
  | { status: 'scanning' }
  | { status: 'found';    product: Product }
  | { status: 'notfound'; code: string }
  | { status: 'error';    reason: string }
  | { status: 'manual' }

export function BarcodeScannerSheet({ onClose }: Props) {
  const addToCart = useSaleStore((s) => s.addToCart)

  const videoRef      = useRef<HTMLVideoElement>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const controlsRef   = useRef<{ stop: () => void } | null>(null)
  const lastCodeRef   = useRef<string>('')
  const processingRef = useRef(false)

  const [state,         setState]       = useState<ScanState>({ status: 'scanning' })
  const [manualInput,   setManualInput] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

  /* ── Lookup product ──────────────────────────────── */
  const handleCodeFound = useCallback(async (code: string) => {
    if (processingRef.current) return
    processingRef.current = true

    const product = await db.products
      .where('barcode').equals(code)
      .filter(p => p.tenantId === DEMO_TENANT && !p.deletedAt)
      .first()

    if (product) {
      setState({ status: 'found', product })
      if ('vibrate' in navigator) navigator.vibrate([60, 30, 60])
    } else {
      setState({ status: 'notfound', code })
    }
  }, [])

  /* ── Stop camera + ZXing ─────────────────────────── */
  const stopCamera = useCallback(() => {
    try { controlsRef.current?.stop() } catch { /* ignore */ }
    controlsRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  /* ── Start camera + ZXing ────────────────────────── */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) { stream.getTracks().forEach(t => t.stop()); return }
      video.srcObject = stream
      await video.play()

      // Dynamically import ZXing (works on iOS Safari + all browsers)
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const { DecodeHintType, BarcodeFormat } = await import('@zxing/library')

      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE,  BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      ])

      const reader = new BrowserMultiFormatReader(hints)
      setState({ status: 'scanning' })

      const controls = await reader.decodeFromVideoElement(video, async (result) => {
        if (!result) return
        const code = result.getText()
        if (!code || code === lastCodeRef.current) return
        lastCodeRef.current = code
        controls?.stop()
        await handleCodeFound(code)
      })
      controlsRef.current = controls

    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setState({ status: 'error', reason: 'camera_denied' })
      } else if (err?.name === 'NotFoundError') {
        setState({ status: 'error', reason: 'no_camera' })
      } else {
        setState({ status: 'manual' })
      }
    }
  }, [handleCodeFound])

  /* ── Retry scan ──────────────────────────────────── */
  const handleRetry = useCallback(() => {
    lastCodeRef.current  = ''
    processingRef.current = false
    stopCamera()
    setState({ status: 'scanning' })
    startCamera()
  }, [startCamera, stopCamera])

  /* ── Add to cart + close ─────────────────────────── */
  const handleAddToCart = useCallback((product: Product) => {
    addToCart(product)
    stopCamera()
    onClose()
  }, [addToCart, onClose, stopCamera])

  /* ── Manual search ───────────────────────────────── */
  const handleManualSearch = useCallback(async () => {
    const code = manualInput.trim()
    if (!code) return
    setManualLoading(true)
    await handleCodeFound(code)
    setManualLoading(false)
  }, [manualInput, handleCodeFound])

  /* ── Mount / unmount ─────────────────────────────── */
  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const handleClose = () => { stopCamera(); onClose() }

  /* ─────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/80"
      onClick={handleClose}
      aria-hidden="true"
    >
      <div
        className="w-full md:max-w-md bg-slate-900 rounded-t-2xl md:rounded-2xl max-h-[92dvh] flex flex-col overflow-hidden shadow-pop animate-sheet-up"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2 text-white">
            <ScanLine size={18} strokeWidth={2.25} className="text-primary-400" />
            <span className="text-[15px] font-bold">ស្កែន Barcode</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setState(s => s.status === 'manual' ? { status: 'scanning' } : { status: 'manual' })}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 active:bg-slate-600"
              aria-label="វាយ Barcode ដៃ"
            >
              <Keyboard size={15} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 active:bg-slate-600"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />

          {/* Scan frame overlay */}
          {state.status === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-40">
                <span className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-primary-400 rounded-tl-md" />
                <span className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-primary-400 rounded-tr-md" />
                <span className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-primary-400 rounded-bl-md" />
                <span className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-primary-400 rounded-br-md" />
                <div className="absolute inset-x-2 top-1/2 h-0.5 bg-primary-400/80 rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {/* Found overlay */}
          {state.status === 'found' && (
            <div className="absolute inset-0 bg-success-900/60 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-success-500 text-white flex items-center justify-center mx-auto mb-2 text-[32px]">✓</div>
                <p className="text-white font-bold text-[15px]">ជោគជ័យ!</p>
              </div>
            </div>
          )}

          {/* Not found overlay */}
          {state.status === 'notfound' && (
            <div className="absolute inset-0 bg-danger-900/60 flex items-center justify-center">
              <div className="text-center px-6">
                <PackageSearch size={40} className="text-danger-300 mx-auto mb-2" />
                <p className="text-white font-bold text-[14px]">រកមិនឃើញទំនិញ</p>
                <p className="text-danger-300 text-[12px] mt-1 font-mono">{state.code}</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {state.status === 'error' && (
            <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center">
              <div className="text-center px-6">
                <ZapOff size={36} className="text-slate-400 mx-auto mb-3" />
                <p className="text-white font-bold text-[14px]">
                  {state.reason === 'camera_denied' ? 'មិនអនុញ្ញាតប្រើ Camera' : 'រក Camera មិនឃើញ'}
                </p>
                <p className="text-slate-400 text-[12px] mt-1 leading-relaxed">
                  {state.reason === 'camera_denied'
                    ? 'ចូល Settings > Safari > Camera ដើម្បីអនុញ្ញាត'
                    : 'ឧបករណ៍មិនមាន Camera'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom panel */}
        <div className="shrink-0 px-4 py-4 space-y-3">

          {/* Manual input */}
          {state.status === 'manual' && (
            <div>
              <p className="text-[11px] text-slate-400 mb-2">វាយ Barcode ដៃ</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                  placeholder="8851234567890"
                  autoFocus
                  className="flex-1 h-11 rounded-xl bg-slate-700 border border-slate-600 text-white px-4 text-[14px] font-mono placeholder:text-slate-500 focus:outline-none focus:border-primary-500"
                />
                <button
                  type="button"
                  disabled={!manualInput.trim() || manualLoading}
                  onClick={handleManualSearch}
                  className="h-11 px-4 rounded-xl bg-primary-600 text-white font-bold text-[13px] disabled:opacity-50 active:bg-primary-700 transition-colors"
                >
                  {manualLoading ? '…' : 'ស្វែងរក'}
                </button>
              </div>
            </div>
          )}

          {/* Hint */}
          {state.status === 'scanning' && (
            <p className="text-center text-[12px] text-slate-400">
              ដាក់ Barcode ក្នុង Frame ខាងលើ
            </p>
          )}

          {/* Found: product card */}
          {state.status === 'found' && (
            <div className="rounded-xl bg-slate-800 border border-slate-600 p-3 flex items-center gap-3">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-slate-700 flex items-center justify-center text-[24px] overflow-hidden">
                {state.product.imageUri
                  ? <img src={state.product.imageUri} alt="" className="w-full h-full object-cover" />
                  : (state.product.emoji || '📦')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-white truncate">{state.product.nameKm}</p>
                <p className="text-[12px] text-primary-400 font-semibold tabular-nums">
                  {formatKHR(state.product.sellPrice)}
                  <span className="text-slate-500"> · {state.product.stockQty} {state.product.unit}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAddToCart(state.product)}
                className="shrink-0 h-10 px-4 rounded-xl bg-success-600 text-white font-bold text-[13px] active:bg-success-700 transition-colors"
              >
                + រទេះ
              </button>
            </div>
          )}

          {/* Not found: retry */}
          {state.status === 'notfound' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="flex-1 h-11 rounded-xl bg-slate-700 text-white font-semibold text-[14px] active:bg-slate-600"
              >
                ស្កែនម្ដងទៀត
              </button>
              <button
                type="button"
                onClick={() => setState({ status: 'manual' })}
                className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 font-semibold text-[13px] active:bg-slate-800"
              >
                <Keyboard size={14} className="inline mr-1.5 mb-0.5" />
                វាយដៃ
              </button>
            </div>
          )}

          {/* Error: show manual */}
          {state.status === 'error' && (
            <button
              type="button"
              onClick={() => setState({ status: 'manual' })}
              className="w-full h-11 rounded-xl bg-slate-700 text-white font-semibold text-[14px] active:bg-slate-600 flex items-center justify-center gap-2"
            >
              <Keyboard size={16} />
              ប្រើ Manual Input ជំនួស
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
