import { v4 as uuidv4 } from 'uuid'
import { supabase } from './auth'

export const generateApiKey = async (userId: str, name: str) => {
  const key = `pk_${uuidv4().replace(/-/g, '')}`
  const { data, error } = await supabase
    .from('api_keys')
    .insert({ user_id: userId, name, key_hash: key }) // In production, hash the key!
    .select()
    .single()
    
  if (error) throw error
  return { ...data, key }
}

export const revokeApiKey = async (id: str) => {
  const { error } = await supabase
    .from('api_keys')
    .update({ active: false })
    .eq('id', id)
    
  if (error) throw error
}
