'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
// Note: useRef kept for initCalledRef
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { School } from '@/types/database'

type UserRoleType = 'super_admin' | 'school_admin' | 'teacher' | 'staff'

interface UserRoleRecord {
  role: UserRoleType
  school_id: string | null
}

interface AuthContextType {
  user: User | null
  userRole: UserRoleType | null
  schools: School[]
  currentSchool: School | null
  setCurrentSchool: (school: School | null) => void
  loading: boolean
  isOwner: boolean // Alpna/Prashant - super_admin with all schools
  isDirector: boolean // school_admin for a specific school
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRoleType | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [currentSchool, setCurrentSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)

  // Track if auth has been initialized (prevents double init on StrictMode)
  const initCalledRef = useRef(false)

  useEffect(() => {
    // Prevent double initialization
    if (initCalledRef.current) {
      console.log('[Auth] Init already called, skipping')
      return
    }
    initCalledRef.current = true

    // Use singleton client
    const supabase = createClient()
    let isMounted = true
    let initialCheckDone = false

    console.log('[Auth] Setting up auth listener...')

    // Listen for auth changes - this is the PRIMARY way we get the session
    // onAuthStateChange fires immediately with current session (INITIAL_SESSION event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event, session ? 'has session' : 'no session')

        // Mark as done immediately to prevent fallback timer from firing
        initialCheckDone = true

        if (!isMounted) return

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserRole(null)
          setSchools([])
          setCurrentSchool(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          setUser(session.user)
          console.log('[Auth] Fetching user role and schools...')
          try {
            await fetchUserRoleAndSchools(session.user.id)
            console.log('[Auth] Initialization complete')
          } catch (e) {
            console.error('[Auth] Error fetching schools:', e)
          }
        }

        if (isMounted) setLoading(false)
      }
    )

    // Fallback: if onAuthStateChange doesn't fire within 3 seconds, try getSession directly
    const fallbackTimer = setTimeout(async () => {
      if (!initialCheckDone && isMounted) {
        console.warn('[Auth] Auth listener timeout - trying getSession fallback...')
        try {
          const { data: { session } } = await supabase.auth.getSession()
          console.log('[Auth] Fallback getSession result:', session ? 'has session' : 'no session')
          if (session?.user && isMounted) {
            setUser(session.user)
            await fetchUserRoleAndSchools(session.user.id)
          }
        } catch (e) {
          console.error('[Auth] Fallback getSession failed:', e)
        }
        if (isMounted) setLoading(false)
      }
    }, 3000)

    return () => {
      isMounted = false
      clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserRoleAndSchools = async (userId: string) => {
    const supabase = createClient()

    try {
      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, school_id')
        .eq('user_id', userId)
        .returns<UserRoleRecord[]>()

      if (rolesError) throw rolesError

      if (roles && roles.length > 0) {
        // Check if super_admin
        const superAdminRole = roles.find((r: UserRoleRecord) => r.role === 'super_admin')
        if (superAdminRole) {
          setUserRole('super_admin')
        } else {
          // Use first role found
          setUserRole(roles[0].role)
        }
      }

      // Fetch accessible schools
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .eq('status', 'active')
        .order('name')

      if (schoolsError) throw schoolsError

      if (schoolsData) {
        setSchools(schoolsData)
        // If only one school, set it as current
        if (schoolsData.length === 1) {
          setCurrentSchool(schoolsData[0])
        }
      }
    } catch (error) {
      console.error('Error fetching user role and schools:', error)
    }
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
    setSchools([])
    setCurrentSchool(null)
    // Redirect to login page
    window.location.href = '/login'
  }

  const isOwner = userRole === 'super_admin'
  const isDirector = userRole === 'school_admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        schools,
        currentSchool,
        setCurrentSchool,
        loading,
        isOwner,
        isDirector,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
