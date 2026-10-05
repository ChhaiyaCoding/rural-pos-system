'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PackageSearch, ZapOff, Keyboard, Check, Plus } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { ProductThumb } from '@/components/ui/ProductThumb'
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
    <Sheet
      open
      onClose={handleClose}
      tone="dark"
      title="ស្កែន Barcode"
      bodyClassName="p-0"
      headerActions={
        <IconButton
          variant="onDark"
          aria-label="វាយ Barcode ដៃ"
          aria-pressed={state.status === 'manual'}
          onClick={() => setState(s => s.status === 'manual' ? { status: 'scanning' } : { status: 'manual' })}
        >
          <Keyboard size={20} strokeWidth={2} />
        </IconButton>
      }
    >
      {/* Camera viewport */}
      <div className="relative overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />

        {/* Scan frame overlay */}
        {state.status === 'scanning' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <div className="relative h-40 w-56">
              <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-md border-l-[3px] border-t-[3px] border-accent" />
              <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-md border-r-[3px] border-t-[3px] border-accent" />
              <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-md border-b-[3px] border-l-[3px] border-accent" />
              <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-md border-b-[3px] border-r-[3px] border-accent" />
              <div className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse rounded-full bg-accent/80" />
            </div>
          </div>
        )}

        {/* Found overlay */}
        {state.status === 'found' && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/70" role="status">
            <div className="text-center">
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-ink-900" aria-hidden="true">
                <Check size={34} strokeWidth={3} />
              </div>
              <p className="text-body font-bold text-white">ជោគជ័យ!</p>
            </div>
          </div>
        )}

        {/* Not found overlay */}
        {state.status === 'notfound' && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/80" role="status">
            <div className="px-6 text-center">
              <PackageSearch size={40} className="mx-auto mb-2 text-debt-on-dark" aria-hidden="true" />
              <p className="text-body font-bold text-white">រកមិនឃើញទំនិញ</p>
              <p className="mt-1 font-mono text-meta text-debt-on-dark">{state.code}</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {state.status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/90" role="alert">
            <div className="px-6 text-center">
              <ZapOff size={36} className="mx-auto mb-3 text-ink-300" aria-hidden="true" />
              <p className="text-body font-bold text-white">
                {state.reason === 'camera_denied' ? 'មិនអនុញ្ញាតប្រើ Camera' : 'រក Camera មិនឃើញ'}
              </p>
              <p className="mt-1 text-meta text-ink-300">
                {state.reason === 'camera_denied'
                  ? 'ចូល Settings > Safari > Camera ដើម្បីអនុញ្ញាត'
                  : 'ឧបករណ៍មិនមាន Camera'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div className="space-y-3 px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:px-6">

        {/* Manual input */}
        {state.status === 'manual' && (
          <div>
            <label htmlFor="manual-barcode" className="mb-2 block text-meta text-ink-300">វាយ Barcode ដៃ</label>
            <div className="flex gap-2">
              <input
                id="manual-barcode"
                type="text"
                inputMode="numeric"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                placeholder="8851234567890"
                autoFocus
                className="h-12 min-w-0 flex-1 rounded-md bg-ink-800 px-4 font-mono text-body text-white placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <Button variant="primary" disabled={!manualInput.trim() || manualLoading} onClick={handleManualSearch}>
                {manualLoading ? '…' : 'ស្វែងរក'}
              </Button>
            </div>
          </div>
        )}

        {/* Hint */}
        {state.status === 'scanning' && (
          <p className="text-center text-body-sm text-ink-300">
            ដាក់ Barcode ក្នុង Frame ខាងលើ
          </p>
        )}

        {/* Found: product card */}
        {state.status === 'found' && (
          <div className="flex items-center gap-3 rounded-lg bg-ink-800 p-3">
            <ProductThumb product={state.product} size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-bold text-white">{state.product.nameKm}</p>
              <p className="text-meta font-semibold tabular-nums text-accent">
                {formatKHR(state.product.sellPrice)}
                <span className="text-ink-300"> · {state.product.stockQty} {state.product.unit}</span>
              </p>
            </div>
            <Button variant="primary" icon={<Plus size={18} strokeWidth={2.5} />} onClick={() => handleAddToCart(state.product)}>
              រទេះ
            </Button>
          </div>
        )}

        {/* Not found: retry */}
        {state.status === 'notfound' && (
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" onClick={handleRetry}>
              ស្កែនម្ដងទៀត
            </Button>
            <Button variant="onDark" className="flex-1" icon={<Keyboard size={16} />} onClick={() => setState({ status: 'manual' })}>
              វាយដៃ
            </Button>
          </div>
        )}

        {/* Error: show manual */}
        {state.status === 'error' && (
          <Button variant="onDark" fullWidth icon={<Keyboard size={16} />} onClick={() => setState({ status: 'manual' })}>
            ប្រើ Manual Input ជំនួស
          </Button>
        )}
      </div>
    </Sheet>
  )
}
