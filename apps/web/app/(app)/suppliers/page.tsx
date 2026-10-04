'use client'

import { Truck } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

export default function SuppliersPage() {
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="អ្នកផ្គត់ផ្គង់" subtitle="Suppliers · ការ​ទិញ​ចូល" backHref="/inventory" />
      <EmptyState
        fullHeight
        icon={<Truck size={30} strokeWidth={1.5} />}
        title="កំពុង​អភិវឌ្ឍ"
        description="មុខងារ​គ្រប់គ្រង​អ្នកផ្គត់ផ្គង់ និង​ការ​ទិញ​ចូល​ស្តុក នឹង​មក​ដល់​ឆាប់ៗ។"
      />
    </div>
  )
}
