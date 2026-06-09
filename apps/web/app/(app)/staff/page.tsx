'use client'

import { UserCog } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function StaffPage() {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="shrink-0 px-4 pt-5 pb-4 bg-white border-b border-slate-200">
        <h1 className="text-[19px] font-bold text-slate-900">បុគ្គលិក</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">អ្នកប្រើ & សិទ្ធិ</p>
      </header>
      <EmptyState
        icon={<div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center">
          <UserCog size={30} strokeWidth={1.5} className="text-slate-300" />
        </div>}
        title="កំពុង​អភិវឌ្ឍ"
        description="មុខងារ​គ្រប់គ្រង​បុគ្គលិក (ម្ចាស់ · អ្នកគិតលុយ · សិទ្ធិ) នឹង​មក​ដល់​ឆាប់ៗ។"
      />
    </div>
  )
}
