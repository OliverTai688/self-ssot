import { Suspense } from "react"

import AdminDetailLoading from "../loading"
import AdminDetailPage from "../page"

export const dynamic = "force-dynamic"

export default function AdminDetailAllPage() {
  return (
    <Suspense fallback={<AdminDetailLoading />}>
      <AdminDetailAllContent />
    </Suspense>
  )
}

async function AdminDetailAllContent() {
  return AdminDetailPage()
}
