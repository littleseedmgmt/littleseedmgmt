export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string
          name: string
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          phone: string | null
          email: string | null
          timezone: string
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          phone?: string | null
          email?: string | null
          timezone?: string
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          phone?: string | null
          email?: string | null
          timezone?: string
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          school_id: string | null
          role: 'super_admin' | 'school_admin' | 'teacher' | 'staff'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          school_id?: string | null
          role: 'super_admin' | 'school_admin' | 'teacher' | 'staff'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          school_id?: string | null
          role?: 'super_admin' | 'school_admin' | 'teacher' | 'staff'
          created_at?: string
        }
      }
      classrooms: {
        Row: {
          id: string
          school_id: string
          name: string
          age_group: 'infant' | 'toddler' | 'preschool' | 'pre_k'
          capacity: number
          current_enrollment: number
          lead_teacher_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          age_group: 'infant' | 'toddler' | 'preschool' | 'pre_k'
          capacity: number
          current_enrollment?: number
          lead_teacher_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          age_group?: 'infant' | 'toddler' | 'preschool' | 'pre_k'
          capacity?: number
          current_enrollment?: number
          lead_teacher_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          school_id: string
          first_name: string
          last_name: string
          date_of_birth: string
          classroom_id: string | null
          guardian_name: string
          guardian_phone: string | null
          guardian_email: string | null
          guardian_relationship: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          medical_notes: string | null
          allergies: string | null
          status: 'enrolled' | 'withdrawn' | 'graduated' | 'on_leave'
          enrollment_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          first_name: string
          last_name: string
          date_of_birth: string
          classroom_id?: string | null
          guardian_name: string
          guardian_phone?: string | null
          guardian_email?: string | null
          guardian_relationship?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_notes?: string | null
          allergies?: string | null
          status?: 'enrolled' | 'withdrawn' | 'graduated' | 'on_leave'
          enrollment_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          first_name?: string
          last_name?: string
          date_of_birth?: string
          classroom_id?: string | null
          guardian_name?: string
          guardian_phone?: string | null
          guardian_email?: string | null
          guardian_relationship?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_notes?: string | null
          allergies?: string | null
          status?: 'enrolled' | 'withdrawn' | 'graduated' | 'on_leave'
          enrollment_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      teachers: {
        Row: {
          id: string
          school_id: string
          user_id: string | null
          employee_id: string | null
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          hire_date: string
          status: 'active' | 'on_leave' | 'terminated'
          hourly_rate: number | null
          pto_balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          user_id?: string | null
          employee_id?: string | null
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          hire_date: string
          status?: 'active' | 'on_leave' | 'terminated'
          hourly_rate?: number | null
          pto_balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          user_id?: string | null
          employee_id?: string | null
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          hire_date?: string
          status?: 'active' | 'on_leave' | 'terminated'
          hourly_rate?: number | null
          pto_balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      attendance: {
        Row: {
          id: string
          school_id: string
          student_id: string
          date: string
          check_in_time: string | null
          check_out_time: string | null
          status: 'present' | 'absent' | 'late' | 'excused'
          notes: string | null
          recorded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          student_id: string
          date: string
          check_in_time?: string | null
          check_out_time?: string | null
          status: 'present' | 'absent' | 'late' | 'excused'
          notes?: string | null
          recorded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          student_id?: string
          date?: string
          check_in_time?: string | null
          check_out_time?: string | null
          status?: 'present' | 'absent' | 'late' | 'excused'
          notes?: string | null
          recorded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shifts: {
        Row: {
          id: string
          school_id: string
          teacher_id: string
          classroom_id: string | null
          date: string
          start_time: string
          end_time: string
          actual_start: string | null
          actual_end: string | null
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          teacher_id: string
          classroom_id?: string | null
          date: string
          start_time: string
          end_time: string
          actual_start?: string | null
          actual_end?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          teacher_id?: string
          classroom_id?: string | null
          date?: string
          start_time?: string
          end_time?: string
          actual_start?: string | null
          actual_end?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pto_requests: {
        Row: {
          id: string
          school_id: string
          teacher_id: string
          start_date: string
          end_date: string
          type: 'vacation' | 'sick' | 'personal' | 'unpaid'
          hours_requested: number
          status: 'pending' | 'approved' | 'rejected'
          notes: string | null
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          teacher_id: string
          start_date: string
          end_date: string
          type: 'vacation' | 'sick' | 'personal' | 'unpaid'
          hours_requested: number
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          teacher_id?: string
          start_date?: string
          end_date?: string
          type?: 'vacation' | 'sick' | 'personal' | 'unpaid'
          hours_requested?: number
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'super_admin' | 'school_admin' | 'teacher' | 'staff'
      student_status: 'enrolled' | 'withdrawn' | 'graduated' | 'on_leave'
      employment_status: 'active' | 'on_leave' | 'terminated'
      age_group: 'infant' | 'toddler' | 'preschool' | 'pre_k'
      attendance_status: 'present' | 'absent' | 'late' | 'excused'
      shift_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
      pto_type: 'vacation' | 'sick' | 'personal' | 'unpaid'
      approval_status: 'pending' | 'approved' | 'rejected'
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Convenience types
export type School = Tables<'schools'>
export type User = Tables<'users'>
export type UserRole = Tables<'user_roles'>
export type Classroom = Tables<'classrooms'>
export type Student = Tables<'students'>
export type Teacher = Tables<'teachers'>
export type Attendance = Tables<'attendance'>
export type Shift = Tables<'shifts'>
export type PTORequest = Tables<'pto_requests'>
