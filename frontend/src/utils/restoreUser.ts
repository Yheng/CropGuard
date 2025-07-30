import { restoreUser } from '../services/demoAuth'

// Function to restore the lost user
export const restoreTestUser = () => {
  try {
    const restoredUser = restoreUser('testuser@email.com', 'User#1234', 'testuser')
    console.log('✅ User restored successfully:', restoredUser)
    console.log('You can now login with testuser@email.com / User#1234')
    return restoredUser
  } catch (error) {
    console.error('❌ Failed to restore user:', error)
    return null
  }
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as any).restoreTestUser = restoreTestUser
}