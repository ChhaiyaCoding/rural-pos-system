import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserId, TenantId } from '@/types/branded'

interface AuthState {
  userId: UserId | null
  tenantId: TenantId | null
  isAuthenticated: boolean
}

interface AuthActions {
  setAuth: (userId: UserId, tenantId: TenantId) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      userId: null,
      tenantId: null,
      isAuthenticated: false,
      setAuth: (userId, tenantId) =>
        set({ userId, tenantId, isAuthenticated: true }),
      clearAuth: () =>
        set({ userId: null, tenantId: null, isAuthenticated: false }),
    }),
    {
      name: 'pos-auth',
      partialize: (state) => ({
        userId: state.userId,
        tenantId: state.tenantId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
