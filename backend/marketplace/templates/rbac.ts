import { supabase } from '../lib/auth'

export const checkRole = async (requiredRole: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === requiredRole || profile?.role === 'admin'
}

export const isAdmin = () => checkRole('admin')
