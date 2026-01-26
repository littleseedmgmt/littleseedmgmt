'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { School } from '@/types/database'

// Timeout wrapper to prevent hanging promises
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMsg)), ms)
  })
  return Promise.race([promise, timeout])
}

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

  // Use ref to ensure single supabase client instance across renders
  const supabaseRef = useRef(createClient())
  const initCalledRef = useRef(false)

  useEffect(() => {
    // Prevent double initialization
    if (initCalledRef.current) {
      console.log('[Auth] Init already called, skipping')
      return
    }
    initCalledRef.current = true

    const supabase = supabaseRef.current
    let isMounted = true

    // Get initial session with timeout protection
    const initAuth = async () => {
      console.log('[Auth] Starting initialization...')

      try {
        // Add 5-second timeout to prevent hanging
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          5000,
          'Session check timed out'
        )

        console.log('[Auth] Session check complete:', session ? 'has session' : 'no session')

        if (session?.user && isMounted) {
          setUser(session.user)
          console.log('[Auth] Fetching user role and schools...')
          // Wait for schools to load before marking as done
          await withTimeout(
            fetchUserRoleAndSchools(session.user.id),
            5000,
            'Fetching schools timed out'
          )
          console.log('[Auth] Initialization complete')
          if (isMounted) setLoading(false)
        } else {
          // No session - done loading
          console.log('[Auth] No session, done loading')
          if (isMounted) setLoading(false)
        }
      } catch (error) {
        // Handle timeout or other errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.log('[Auth] Init aborted (this is usually fine)')
          } else if (error.message.includes('timed out')) {
            console.warn('[Auth] Session check timed out - treating as no session')
          } else {
            console.error('[Auth] Error initializing:', error.message)
          }
        }
        // On any error, stop loading to prevent infinite hang
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event)
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
          await fetchUserRoleAndSchools(session.user.id)
        }
        setLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserRoleAndSchools = async (userId: string) => {
    const supabase = supabaseRef.current

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
    const supabase = supabaseRef.current
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
