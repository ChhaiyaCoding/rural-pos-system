import { create } from 'zustand'
import type { Customer, DebtTransaction } from '@/types'
import type { AppError, CustomerId } from '@/types'

interface DebtState {
  customers: Customer[]
  activeCustomerId: CustomerId | null
  transactions: DebtTransaction[]
  isLoading: boolean
  error: AppError | null
}

interface DebtActions {
  setCustomers: (customers: Customer[]) => void
  upsertCustomer: (customer: Customer) => void
  setActiveCustomer: (customerId: CustomerId | null) => void
  setTransactions: (txns: DebtTransaction[]) => void
  addTransaction: (txn: DebtTransaction) => void
  setLoading: (value: boolean) => void
  setError: (error: AppError | null) => void
}

export const useDebtStore = create<DebtState & DebtActions>()((set) => ({
  customers: [],
  activeCustomerId: null,
  transactions: [],
  isLoading: false,
  error: null,

  setCustomers: (customers) => set({ customers }),

  upsertCustomer: (customer) =>
    set((state) => {
      const exists = state.customers.some((c) => c.id === customer.id)
      return {
        customers: exists
          ? state.customers.map((c) => (c.id === customer.id ? customer : c))
          : [...state.customers, customer],
      }
    }),

  setActiveCustomer: (customerId) => set({ activeCustomerId: customerId }),
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (txn) =>
    set((state) => ({ transactions: [txn, ...state.transactions] })),
  setLoading: (value) => set({ isLoading: value }),
  setError: (error) => set({ error }),
}))
