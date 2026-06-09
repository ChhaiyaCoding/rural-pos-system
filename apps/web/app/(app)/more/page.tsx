'use client'

import Link from 'next/link'
import { Users, NotebookText, Wallet, UserCog, Settings, ChevronRight } from 'lucide-react'

interface MoreItem {
  href:  string
  icon:  React.ReactNode
  label: string
  sub:   string
}

const GROUPS: { title: string; items: MoreItem[] }[] = [
  {
    title: 'អតិថិជន & បំណុល',
    items: [
      { href: '/debt',     icon: <Users size={18} />,        label: 'អតិថិជន',     sub: 'បញ្ជី​អតិថិជន​ទាំងអស់' },
      { href: '/debt',     icon: <NotebookText size={18} />, label: 'សៀវភៅបំណុល', sub: 'អ្នកជំពាក់ · ថ្ងៃកំណត់សង' },
    ],
  },
  {
    title: 'ហិរញ្ញវត្ថុ',
    items: [
      { href: '/expenses', icon: <Wallet size={18} />,       label: 'ការចំណាយ',    sub: 'កត់ត្រា​ការ​ចំណាយ​ប្រចាំ​ថ្ងៃ' },
    ],
  },
  {
    title: 'គ្រប់គ្រង',
    items: [
      { href: '/staff',    icon: <UserCog size={18} />,      label: 'បុគ្គលិក',    sub: 'អ្នកប្រើ & សិទ្ធិ' },
      { href: '/settings', icon: <Settings size={18} />,     label: 'ការកំណត់',    sub: 'ហាង · receipt · backup' },
    ],
  },
]

export default function MorePage() {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="shrink-0 px-4 pt-5 pb-4 bg-white border-b border-slate-200">
        <h1 className="text-[19px] font-bold text-slate-900">ច្រើនទៀត</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">មុខងារ​បន្ថែម & គ្រប់គ្រង</p>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-8 space-y-4 max-w-xl mx-auto">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                {group.title}
              </h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
                {group.items.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors"
                  >
                    <span className="shrink-0 w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-slate-800">{item.label}</p>
                      <p className="text-[12px] text-slate-400">{item.sub}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          ))}

          <p className="text-center text-[11px] text-slate-300 pt-2">Rural POS v1.0.0</p>
        </div>
      </div>
    </div>
  )
}
