// Authentication debugging utilities

export function clearAllAuthData() {
  console.log('🧹 Clearing all authentication data...')
  
  // List all localStorage keys before clearing
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) keys.push(key)
  }
  
  console.log('📋 Current localStorage keys:', keys)
  
  // Clear specific auth-related keys
  const authKeys = [
    'auth_token',
    'user_data',
    'cropguard_user_1_',
    'cropguard_user_2_',
    'cropguard_user_3_',
    'demo_token_farmer'
  ]
  
  authKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`🗑️ Removing ${key}:`, localStorage.getItem(key))
      localStorage.removeItem(key)
    }
  })
  
  // Clear any keys that start with auth-related prefixes
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (
      key.startsWith('auth_') ||
      key.startsWith('demo_token_') ||
      key.startsWith('cropguard_user_') ||
      key.includes('token') ||
      key.includes('user_data')
    )) {
      keysToRemove.push(key)
    }
  }
  
  keysToRemove.forEach(key => {
    console.log(`🗑️ Removing auth-related key ${key}:`, localStorage.getItem(key))
    localStorage.removeItem(key)
  })
  
  // Clear session storage as well
  sessionStorage.clear()
  
  console.log('✅ All authentication data cleared!')
  console.log('🔄 Please refresh the page to see changes')
}

export async function debugAuthState() {
  console.log('🔍 Authentication Debug Information:')
  console.log('📊 localStorage contents:')
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const value = localStorage.getItem(key)
      console.log(`  ${key}:`, value)
    }
  }
  
  console.log('📊 sessionStorage contents:')
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key) {
      const value = sessionStorage.getItem(key)
      console.log(`  ${key}:`, value)
    }
  }
  
  // Check auth service state
  try {
    // Dynamic import to avoid circular dependencies and require() usage
    const authModule = await import('../services/auth')
    const authService = authModule.authService
    console.log('🔐 Auth service state:')
    console.log('  isAuthenticated:', authService.isAuthenticated())
    console.log('  currentUser:', authService.getCurrentUser())
    console.log('  token:', authService.getToken())
  } catch (error) {
    console.log('❌ Could not access auth service:', error)
  }
}

// Make these functions available in the browser console for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { clearAllAuthData: typeof clearAllAuthData; debugAuthState: typeof debugAuthState }).clearAllAuthData = clearAllAuthData;
  (window as unknown as { clearAllAuthData: typeof clearAllAuthData; debugAuthState: typeof debugAuthState }).debugAuthState = debugAuthState;
  
  console.log('🛠️ Debug functions available:')
  console.log('  - clearAllAuthData(): Clear all authentication data')
  console.log('  - debugAuthState(): Show current authentication state')
}