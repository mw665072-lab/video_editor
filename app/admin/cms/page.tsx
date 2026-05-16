import { Suspense } from 'react'
import { AdminCmsManager } from '@/components/cms/AdminCmsManager'
import { Spinner } from '@/components/ui/spinner'

export default function AdminCmsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#12072f] text-white">
          <Spinner />
        </main>
      }
    >
      <AdminCmsManager />
    </Suspense>
  )
}
