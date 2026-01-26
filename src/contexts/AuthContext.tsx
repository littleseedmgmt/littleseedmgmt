'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    // Get initial session
    const initAuth = async () => {
      try {
        // Use getSession first, then getUser for validation
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user && isMounted) {
          setUser(session.user)
          // Wait for schools to load before marking as done
          await fetchUserRoleAndSchools(session.user.id)
          if (isMounted) setLoading(false)
        } else {
          // No session - done loading
          if (isMounted) setLoading(false)
        }
      } catch (error) {
        // Ignore AbortError - it's usually from React strict mode or navigation
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Auth init aborted (this is usually fine)')
        } else {
          console.error('Error initializing auth:', error)
        }
        // Even on error, stop loading
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
