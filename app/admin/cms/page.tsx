import { Suspense } from 'react'
import { AdminCmsManager } from '@/components/cms/AdminCmsManager'
import { Spinner } from '@/components/ui/spinner'

export default function AdminCmsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb] text-slate-950">
          <Spinner />
        </main>
      }
    >
      <AdminCmsManager />
    </Suspense>
  )
}
