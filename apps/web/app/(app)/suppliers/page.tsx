'use client'

import { Truck } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function SuppliersPage() {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="shrink-0 px-4 pt-5 pb-4 bg-white border-b border-slate-200">
        <h1 className="text-[19px] font-bold text-slate-900">អ្នកផ្គត់ផ្គង់</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">Suppliers · ការ​ទិញ​ចូល</p>
      </header>
      <EmptyState
        icon={<div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center">
          <Truck size={30} strokeWidth={1.5} className="text-slate-300" />
        </div>}
        title="កំពុង​អភិវឌ្ឍ"
        description="មុខងារ​គ្រប់គ្រង​អ្នកផ្គត់ផ្គង់ និង​ការ​ទិញ​ចូល​ស្តុក នឹង​មក​ដល់​ឆាប់ៗ។"
      />
    </div>
  )
}
