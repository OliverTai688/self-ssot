import { Suspense } from "react"

import AdminPage from "../../page"
import AdminDetailLoading from "../loading"

export const dynamic = "force-dynamic"

export default function AdminDetailAllPage() {
  return (
    <Suspense fallback={<AdminDetailLoading />}>
      <AdminDetailAllContent />
    </Suspense>
  )
}

async function AdminDetailAllContent() {
  return AdminPage({ searchParams: Promise.resolve({ detail: "all" }) })
}
