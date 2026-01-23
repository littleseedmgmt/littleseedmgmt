'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AuthHandler() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Handle hash-based auth (implicit flow)
    const handleHashAuth = async () => {
      // Check if there's a hash with auth tokens
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const type = params.get('type')

        if (accessToken) {
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname)

          // Redirect based on type
          if (type === 'recovery' || type === 'magiclink') {
            router.push('/reset-password')
          } else {
            router.push('/dashboard')
          }
        }
      }
    }

    handleHashAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/reset-password')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return null
}
