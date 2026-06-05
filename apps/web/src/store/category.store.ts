import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Category {
  id: string      // stable — products reference this; never changes on rename
  label: string   // Khmer display name
}

/** Default categories. ids match the original hardcoded set so existing
 *  products keep their category after this store is introduced. */
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food',         label: 'ម្ហូបអាហារ' },
  { id: 'drink',        label: 'ភេសជ្ជៈ' },
  { id: 'household',    label: 'គ្រឿងប្រើប្រាស់' },
  { id: 'medicine',     label: 'ថ្នាំ/សុខភាព' },
  { id: 'construction', label: 'គ្រឿងសំណង់' },
  { id: 'clothing',     label: 'សំលៀកបំពាក់' },
  { id: 'other',        label: 'ផ្សេងៗ' },
]

interface CategoryState {
  categories: Category[]
}

interface CategoryActions {
  /** Add a new category by label; returns the generated id (or existing id). */
  addCategory: (label: string) => string
  renameCategory: (id: string, label: string) => void
  removeCategory: (id: string) => void
  /** Ensure a category id exists (used when a product has a legacy/custom id). */
  ensureCategory: (id: string, label?: string) => void
  resetCategories: () => void
}

export const useCategoryStore = create<CategoryState & CategoryActions>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,

      addCategory: (label) => {
        const name = label.trim()
        if (!name) return ''
        const existing = get().categories.find((c) => c.label === name)
        if (existing) return existing.id
        const id = `cat-${Date.now()}`
        set((s) => ({ categories: [...s.categories, { id, label: name }] }))
        return id
      },

      renameCategory: (id, label) =>
        set((s) => {
          const name = label.trim()
          if (!name) return s
          return { categories: s.categories.map((c) => (c.id === id ? { ...c, label: name } : c)) }
        }),

      removeCategory: (id) =>
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

      ensureCategory: (id, label) =>
        set((s) => {
          if (!id || s.categories.some((c) => c.id === id)) return s
          return { categories: [...s.categories, { id, label: label?.trim() || id }] }
        }),

      resetCategories: () => set({ categories: DEFAULT_CATEGORIES }),
    }),
    { name: 'pos-categories' }
  )
)
