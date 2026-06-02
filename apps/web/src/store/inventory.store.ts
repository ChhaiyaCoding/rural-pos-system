import { create } from 'zustand'
import type { Product } from '@/types'
import type { AppError, ProductId } from '@/types'

interface InventoryState {
  products: Product[]
  isLoading: boolean
  error: AppError | null
}

interface InventoryActions {
  setProducts: (products: Product[]) => void
  upsertProduct: (product: Product) => void
  removeProduct: (productId: ProductId) => void
  setLoading: (value: boolean) => void
  setError: (error: AppError | null) => void
}

export const useInventoryStore = create<InventoryState & InventoryActions>()(
  (set) => ({
    products: [],
    isLoading: false,
    error: null,

    setProducts: (products) => set({ products }),

    upsertProduct: (product) =>
      set((state) => {
        const exists = state.products.some((p) => p.id === product.id)
        return {
          products: exists
            ? state.products.map((p) => (p.id === product.id ? product : p))
            : [...state.products, product],
        }
      }),

    removeProduct: (productId) =>
      set((state) => ({
        products: state.products.filter((p) => p.id !== productId),
      })),

    setLoading: (value) => set({ isLoading: value }),
    setError: (error) => set({ error }),
  })
)
