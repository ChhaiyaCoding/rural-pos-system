import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface StoreProfile {
  storeName: string
  storeAddress: string
  storePhone: string
  storeLogo: string | null   // base64 data-URL or null
  cashierName: string
  receiptFooter: string
  // ── Receipt customization ──
  receiptHeaderNote: string  // extra line under store name (slogan / VATTIN…)
  receiptShowLogo: boolean
  receiptShowCashier: boolean
  receiptShowPhone: boolean
  receiptShowAddress: boolean
  /** Paper the receipt is printed on: thermal 58mm / 80mm, or a normal page */
  receiptPaper: '58' | '80' | 'a4'
  /** Reading text size on this device */
  textSize: 'normal' | 'large'
  // ── Currency ──
  exchangeRate: number       // KHR per 1 USD (display conversion only)
}

interface StoreProfileActions {
  update: (patch: Partial<StoreProfile>) => void
  clearLogo: () => void
}

export const useStoreProfile = create<StoreProfile & StoreProfileActions>()(
  persist(
    (set) => ({
      storeName:     'ហាងលក់ទំនិញ',
      storeAddress:  'ភ្នំពេញ',
      storePhone:    '',
      storeLogo:     null,
      cashierName:   'សុខា',
      receiptFooter: '🙏 អរគុណដែលបានមកទិញ!',
      receiptHeaderNote:  '',
      receiptShowLogo:    true,
      receiptShowCashier: true,
      receiptShowPhone:   true,
      receiptShowAddress: true,
      receiptPaper:       '58',
      exchangeRate:       4000,
      textSize:           'normal',

      update: (patch) => set(patch),
      clearLogo: () => set({ storeLogo: null }),
    }),
    { name: 'pos-store-profile' }
  )
)
