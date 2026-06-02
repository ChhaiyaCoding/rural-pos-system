import { create } from 'zustand'
import type { CartItem, Product } from '@/types'
import type { AppError, KHR, ProductId } from '@/types'
import { multiplyKHR, addKHR, toKHR } from '@/lib/money'

interface SaleState {
  cart: CartItem[]
  isCheckingOut: boolean
  error: AppError | null
}

interface SaleActions {
  addToCart: (product: Product, qty?: number) => void
  removeFromCart: (productId: ProductId) => void
  updateQty: (productId: ProductId, qty: number) => void
  setLineDiscount: (productId: ProductId, discount: KHR) => void
  clearCart: () => void
  setCheckingOut: (value: boolean) => void
  setError: (error: AppError | null) => void
}

interface SaleSelectors {
  cartTotal: () => KHR             // after line discounts
  cartSubtotal: () => KHR          // before line discounts
  cartDiscountTotal: () => KHR     // sum of line discounts
  cartCount: () => number
}

export const useSaleStore = create<SaleState & SaleActions & SaleSelectors>()(
  (set, get) => ({
    cart: [],
    isCheckingOut: false,
    error: null,

    addToCart: (product, qty = 1) =>
      set((state) => {
        // Never sell what isn't in stock.
        if (product.stockQty <= 0) return state

        const existing = state.cart.find((i) => i.product.id === product.id)
        if (existing) {
          // Clamp to available stock — no overselling.
          const next = Math.min(existing.qty + qty, product.stockQty)
          if (next === existing.qty) return state // already at max — nothing added
          return {
            cart: state.cart.map((i) =>
              i.product.id === product.id ? { ...i, qty: next } : i
            ),
          }
        }
        return {
          cart: [
            ...state.cart,
            {
              product,
              qty: Math.min(qty, product.stockQty),
              unitPrice: product.sellPrice,
            },
          ],
        }
      }),

    removeFromCart: (productId) =>
      set((state) => ({
        cart: state.cart.filter((i) => i.product.id !== productId),
      })),

    updateQty: (productId, qty) =>
      set((state) => ({
        cart:
          qty <= 0
            ? state.cart.filter((i) => i.product.id !== productId)
            : state.cart.map((i) => {
                if (i.product.id !== productId) return i
                const nextQty = Math.min(qty, i.product.stockQty)
                const gross   = multiplyKHR(i.unitPrice, nextQty)
                // Re-clamp line discount if it now exceeds the new line subtotal
                if (i.lineDiscount != null && i.lineDiscount > gross) {
                  return { ...i, qty: nextQty, lineDiscount: gross }
                }
                return { ...i, qty: nextQty }
              }),
      })),

    setLineDiscount: (productId, discount) =>
      set((state) => ({
        cart: state.cart.map((i) => {
          if (i.product.id !== productId) return i
          const gross   = multiplyKHR(i.unitPrice, i.qty)
          const clamped = Math.max(0, Math.min(discount, gross)) as KHR
          if (clamped > 0) return { ...i, lineDiscount: clamped }
          // Remove the property entirely when 0 (exactOptionalPropertyTypes)
          const { lineDiscount: _drop, ...rest } = i
          return rest
        }),
      })),

    clearCart: () =>
      set({ cart: [], isCheckingOut: false, error: null }),
    setCheckingOut: (value) => set({ isCheckingOut: value }),
    setError: (error) => set({ error }),

    cartTotal: () =>
      get().cart.reduce((sum, item) => {
        const gross = multiplyKHR(item.unitPrice, item.qty)
        const net   = Math.max(0, gross - (item.lineDiscount ?? 0)) as KHR
        return addKHR(sum, net)
      }, toKHR(0)),

    cartSubtotal: () =>
      get().cart.reduce(
        (sum, item) => addKHR(sum, multiplyKHR(item.unitPrice, item.qty)),
        toKHR(0)
      ),

    cartDiscountTotal: () =>
      get().cart.reduce((sum, item) => {
        const gross = multiplyKHR(item.unitPrice, item.qty)
        const disc  = Math.min(item.lineDiscount ?? 0, gross)
        return (sum + disc) as KHR
      }, toKHR(0)),

    cartCount: () =>
      get().cart.reduce((sum, item) => sum + item.qty, 0),
  })
)
