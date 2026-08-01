'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    // Forward user directly to the practice sandbox (Guests allowed)
    router.replace('/practice')
  }, [router])

  return null
}
