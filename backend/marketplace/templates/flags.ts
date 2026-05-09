export const FLAGS = {
  NEW_DASHBOARD: 'new_dashboard',
  BETA_FEATURES: 'beta_features',
  PREMIUM_SUPPORT: 'premium_support'
}

export const isEnabled = (flag: string, user: any) => {
  if (!user) return false
  if (user.role === 'admin') return true
  
  const userFlags = user.metadata?.flags || []
  return userFlags.includes(flag)
}
