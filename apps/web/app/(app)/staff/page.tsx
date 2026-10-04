'use client'

import { UserCog } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

export default function StaffPage() {
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="បុគ្គលិក" subtitle="អ្នកប្រើ & សិទ្ធិ" backHref="/more" />
      <EmptyState
        fullHeight
        icon={<UserCog size={30} strokeWidth={1.5} />}
        title="កំពុង​អភិវឌ្ឍ"
        description="មុខងារ​គ្រប់គ្រង​បុគ្គលិក (ម្ចាស់ · អ្នកគិតលុយ · សិទ្ធិ) នឹង​មក​ដល់​ឆាប់ៗ។"
      />
    </div>
  )
}
