import { create } from 'zustand'

type ModalId =
  | 'checkout'
  | 'debt-payment'
  | 'product-form'
  | 'customer-form'
  | 'barcode-scanner'
  | null

interface UIState {
  activeModal: ModalId
  bottomSheetOpen: boolean
  toastMessage: string | null
}

interface UIActions {
  openModal: (id: NonNullable<ModalId>) => void
  closeModal: () => void
  setBottomSheet: (open: boolean) => void
  showToast: (message: string) => void
  clearToast: () => void
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  activeModal: null,
  bottomSheetOpen: false,
  toastMessage: null,

  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  setBottomSheet: (open) => set({ bottomSheetOpen: open }),
  showToast: (message) => set({ toastMessage: message }),
  clearToast: () => set({ toastMessage: null }),
}))
