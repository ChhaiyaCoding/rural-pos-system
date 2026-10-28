'use client'

import Link from 'next/link'
import { ChartColumn, ReceiptText, Users, Wallet, UserCog, Settings, Send, Phone, LifeBuoy } from 'lucide-react'
import { useStoreProfile } from '@/store/storeProfile.store'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { firstGrapheme } from '@/components/ui/text'
import { SUPPORT, APP_VERSION } from '@/lib/support'

interface MoreTile {
  href:  string
  icon:  React.ReactNode
  label: string
  sub:   string
  /** Placeholder screen — shown with a "ឆាប់ៗ" pill */
  soon?: boolean
}

const TILES: MoreTile[] = [
  { href: '/reports',   icon: <ChartColumn size={22} />, label: 'របាយការណ៍', sub: 'ចំណូល · ចំណាយ · ចំណេញ' },
  { href: '/receipts',  icon: <ReceiptText size={22} />, label: 'វិក្កយបត្រ',   sub: 'ប្រវត្តិ​វិក្កយបត្រ' },
  { href: '/customers', icon: <Users size={22} />,       label: 'អតិថិជន',     sub: 'បញ្ជី​អតិថិជន​ទាំងអស់' },
  { href: '/expenses',  icon: <Wallet size={22} />,      label: 'ការចំណាយ',    sub: 'កត់ត្រា​ការ​ចំណាយ​ប្រចាំ​ថ្ងៃ' },
  { href: '/staff',     icon: <UserCog size={22} />,     label: 'បុគ្គលិក',    sub: 'អ្នកប្រើ & សិទ្ធិ', soon: true },
  { href: '/settings',  icon: <Settings size={22} />,    label: 'ការកំណត់',    sub: 'ហាង · វិក្កយបត្រ · Backup' },
]

export default function MorePage() {
  const { storeName, cashierName } = useStoreProfile()

  return (
    <div className="mx-auto w-full max-w-3xl md:px-6 md:pt-6">
      <PageHeader
        variant="hero"
        className="md:rounded-xl"
        leading={
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent text-title-sm font-bold text-ink-900" aria-hidden="true">
            {firstGrapheme(storeName || 'ហាង')}
          </span>
        }
        title={storeName || 'ហាងលក់ទំនិញ'}
        subtitle={cashierName ? `អ្នកគិតលុយ · ${cashierName}` : 'មុខងារ​បន្ថែម & គ្រប់គ្រង'}
      />

      <nav aria-label="មុខងារ​បន្ថែម" className="grid grid-cols-2 gap-2.5 px-4 pt-5 md:grid-cols-3 md:px-0">
        {TILES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="relative flex min-h-[112px] flex-col justify-between gap-3 rounded-lg bg-surface p-4 transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-bg text-ink-900" aria-hidden="true">
              {t.icon}
            </span>
            <span>
              <span className="block text-body font-bold text-text">{t.label}</span>
              <span className="block text-meta text-text-muted">{t.sub}</span>
            </span>
            {t.soon && <Pill variant="neutral" className="absolute right-3 top-3">ឆាប់ៗ</Pill>}
          </Link>
        ))}
      </nav>

      {(SUPPORT.telegram || SUPPORT.phone) && (
        <section aria-label="ជំនួយ" className="mx-4 mt-5 rounded-lg bg-surface p-4 md:mx-0">
          <p className="flex items-center gap-2 text-body font-bold text-text">
            <LifeBuoy size={20} aria-hidden="true" />
            ត្រូវការជំនួយ?
          </p>
          <p className="mt-0.5 text-meta text-text-muted">សួរយើងបានគ្រប់ពេល — យើងនឹងឆ្លើយឆាប់ៗ</p>
          <div className="mt-3 grid gap-2.5">
            {SUPPORT.telegram && (
              <a
                href={`https://t.me/${SUPPORT.telegram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-14 items-center justify-center gap-2 rounded-md bg-ink-900 text-label-lg font-bold text-white transition-colors active:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Send size={20} strokeWidth={2.25} aria-hidden="true" />
                សួរតាម Telegram
              </a>
            )}
            {SUPPORT.phone && (
              <a
                href={`tel:${SUPPORT.phone.replace(/\s/g, '')}`}
                className="flex h-14 items-center justify-center gap-2 rounded-md border border-line bg-surface text-label-lg font-bold text-ink-900 transition-colors active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
              >
                <Phone size={20} strokeWidth={2.25} aria-hidden="true" />
                ហៅទូរស័ព្ទ {SUPPORT.phone}
              </a>
            )}
          </div>
        </section>
      )}

      <p className="px-4 pb-6 pt-6 text-center text-caption text-text-muted">POS ហាង · ជំនាន់ {APP_VERSION}</p>
    </div>
  )
}
