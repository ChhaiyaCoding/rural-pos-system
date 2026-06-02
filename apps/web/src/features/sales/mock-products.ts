import type { Product } from '@/types'
import type { ProductId, TenantId, KHR } from '@/types/branded'

const T = 'tenant-demo' as TenantId
const D = '2026-01-01T00:00:00Z'

/** Helper: build a Product object with minimal boilerplate */
function p(
  id: string,
  nameKm: string,
  unit: string,
  sell: number,
  stock: number,
  categoryId: string,
  emoji: string,
  lowStock = 5
): Product {
  return {
    id: id as ProductId,
    tenantId: T,
    nameKm,
    barcode: null,
    unit,
    categoryId,
    emoji,
    costPrice: Math.round(sell * 0.7) as KHR,
    sellPrice: sell as KHR,
    stockQty: stock,
    lowStockThreshold: lowStock,
    imageUri: null,
    createdAt: D,
    updatedAt: D,
    deletedAt: null,
    syncedAt: null,
  }
}

export const MOCK_PRODUCTS: Product[] = [
  // ─── ម្ហូបអាហារ ───────────────────────────────────────────────
  p('p01', 'អង្ករ ២គីឡូ',        'ថង់',    5000,  30, 'food',      '🍚'),
  p('p02', 'មីហ្គីឡូ',            'ហ្គីឡូ',  1500,  50, 'food',      '🍜'),
  p('p03', 'នំបុ័ង',              'ចំណិត',  1000,  10, 'food',      '🍞'),
  p('p04', 'ស្ករ ១គីឡូ',          'ថង់',    4000,  20, 'food',      '🧂'),
  p('p05', 'ស៊ុត ១០គ្រាប់',        'ផ្ទាំង',  6000,  10, 'food',      '🥚'),
  p('p06', 'ប្រេងឆានូ ១លីត្រ',    'ដប',     8000,  15, 'food',      '🫙'),

  // ─── ភេសជ្ជៈ ──────────────────────────────────────────────────
  p('p07', 'ទឹកសាំង Angkor',      'ដប',     1500,  24, 'drink',     '🍺'),
  p('p08', 'Fanta ក្រូច',          'ដប',     1500,  18, 'drink',     '🥤'),
  p('p09', 'ទឹកអា ១,៥ L',         'ដប',     2000,   3, 'drink',     '💧', 6),
  p('p10', 'ទឹកដោះគោ Milo',       'កំប៉ុង',  4500,   8, 'drink',     '🥛', 5),
  p('p11', 'Pepsi ៣០០ml',         'ដប',     1500,  20, 'drink',     '🥤'),
  p('p12', 'ស្ករគ្រាប់',           'ថង់',     500,  30, 'food',      '🍬'),

  // ─── គ្រឿងប្រើប្រាស់ ─────────────────────────────────────────
  p('p13', 'ថ្នាំដុសធ្មេញ',        'ផ្ទាំង',  3500,   7, 'household', '🪥'),
  p('p14', 'ក្រដាស Tissue',        'ថង់',    2500,  15, 'household', '🧻'),
  p('p15', 'សាប៊ូដៃ Lifebuoy',     'ជំហរ',   3000,  12, 'household', '🧼'),

  // ─── ស្ទើរអស់ ─────────────────────────────────────
  p('p16', 'ប្រេងស្ករ',           'ដប',     9000,   2, 'food',      '🫙', 5),

  // ─── ស្តុកអស់ ──────────────────────────────────────
  p('p17', 'ស្រាស Green',          'ដប',    12000,   0, 'drink',     '🍶'),
]

/* ─── Categories (ប្រភេទទំនិញ) ───────────────────────────────────
   Lightweight category layer keyed by product id — mirrors the
   PRODUCT_EMOJI pattern, so the domain Product type stays untouched. */

export type CategoryId = 'all' | 'food' | 'drink' | 'household'

export interface Category {
  id: CategoryId
  labelKm: string
}

/** Tab order — `all` first for one-tap "show everything" */
export const CATEGORIES: Category[] = [
  { id: 'all',       labelKm: 'ទាំងអស់' },
  { id: 'food',      labelKm: 'ម្ហូបអាហារ' },
  { id: 'drink',     labelKm: 'ភេសជ្ជៈ' },
  { id: 'household', labelKm: 'គ្រឿងប្រើប្រាស់' },
]

export const PRODUCT_CATEGORY: Record<string, Exclude<CategoryId, 'all'>> = {
  p01: 'food',  p02: 'food',  p03: 'food',  p04: 'food',  p05: 'food', p06: 'food',
  p07: 'drink', p08: 'drink', p09: 'drink', p10: 'drink', p11: 'drink',
  p12: 'food',  // ស្ករគ្រាប់ (candy/snack)
  p13: 'household', p14: 'household', p15: 'household',
  p16: 'food',  // ប្រេងស្ករ
  p17: 'drink', // ស្រាស Green
}

/** Emoji mapped by product id for visual distinction in the product grid */
export const PRODUCT_EMOJI: Record<string, string> = {
  p01: '🍚', p02: '🍜', p03: '🍞', p04: '🧂',
  p05: '🥚', p06: '🫙', p07: '🍺', p08: '🥤',
  p09: '💧', p10: '🥛', p11: '🥤', p12: '🍬',
  p13: '🪥', p14: '🧻', p15: '🧼', p16: '🫙',
  p17: '🍶',
}

