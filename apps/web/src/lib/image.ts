/* Photos are stored as data URIs in IndexedDB/localStorage (and copied into
   backups and the sync queue), so every picked image is shrunk to a small
   square JPEG first — a phone photo of several MB becomes ~15–40 KB. */

export interface ImageOptions {
  /** Output width = height in px */
  size: number
  /** contain: whole image on white (products, logo) · cover: fill + crop (avatars) */
  fit: 'contain' | 'cover'
  /** contain only: share of the square the image may fill (0–1) */
  pad?: number
  quality?: number
}

export const PRODUCT_IMAGE:  ImageOptions = { size: 320, fit: 'contain', pad: 0.84 }
export const CUSTOMER_IMAGE: ImageOptions = { size: 256, fit: 'cover' }
export const LOGO_IMAGE:     ImageOptions = { size: 320, fit: 'contain', pad: 1 }

export function compressImage(file: File, opts: ImageOptions): Promise<string> {
  const { size, fit, pad = 1, quality = 0.85 } = opts
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('READ_FAILED'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('NOT_AN_IMAGE'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width  = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('NO_CANVAS'))

        // White background: transparent PNGs would turn black under JPEG
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, size, size)

        const box   = size * (fit === 'contain' ? pad : 1)
        const scale = fit === 'contain'
          ? Math.min(box / img.width, box / img.height)
          : Math.max(box / img.width, box / img.height)
        const w = img.width  * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)

        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}
