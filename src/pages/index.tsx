import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function RootRedirect() {
  const router = useRouter()

  useEffect(() => {
    // If the app router is active, prefer that root page; otherwise, send to login as fallback
    router.replace('/login')
  }, [router])

  return null
}


