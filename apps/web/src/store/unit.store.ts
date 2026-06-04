import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Default units a Cambodian shop commonly uses. Editable & persisted. */
const DEFAULT_UNITS = [
  'ថង់', 'ដប', 'ចំណិត', 'ហ្គីឡូ', 'ផ្ទាំង', 'ជំហរ',
  'កំប៉ុង', 'ហ្វូង', 'ក្រឡាប់', 'ដំ', 'កញ្ចប់', 'លីត្រ',
  'ម៉ែត្រ', 'បំណែក', 'ជោ', 'មុខ', 'គ្រាប់', 'ប្រអប់',
]

interface UnitState {
  units: string[]
}

interface UnitActions {
  addUnit: (unit: string) => void
  renameUnit: (oldUnit: string, newUnit: string) => void
  removeUnit: (unit: string) => void
  resetUnits: () => void
}

export const useUnitStore = create<UnitState & UnitActions>()(
  persist(
    (set) => ({
      units: DEFAULT_UNITS,

      addUnit: (unit) =>
        set((s) => {
          const u = unit.trim()
          if (!u || s.units.includes(u)) return s
          return { units: [...s.units, u] }
        }),

      renameUnit: (oldUnit, newUnit) =>
        set((s) => {
          const u = newUnit.trim()
          if (!u) return s
          // No-op if new name already exists elsewhere
          if (u !== oldUnit && s.units.includes(u)) return s
          return { units: s.units.map((x) => (x === oldUnit ? u : x)) }
        }),

      removeUnit: (unit) =>
        set((s) => ({ units: s.units.filter((x) => x !== unit) })),

      resetUnits: () => set({ units: DEFAULT_UNITS }),
    }),
    { name: 'pos-units' }
  )
)
