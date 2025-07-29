import { useState } from 'react'
import { authService } from '../../services/auth'
import { DEMO_USERS } from '../../services/demoAuth'

export function LoginDemo() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState(authService.getCurrentUser())

  const handleDemoLogin = async (email: string, password: string) => {
    setIsLoading(true)
    setMessage('')
    
    try {
      const result = await authService.login(email, password)
      setUser(result.user)
      setMessage(`✅ Successfully logged in as ${result.user.name} (${result.user.role})`)
    } catch (error) {
      setMessage(`❌ Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    authService.logout()
    setUser(null)
    setMessage('✅ Logged out successfully')
  }

  if (user) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl border border-white border-opacity-20">
        <h2 className="text-2xl font-bold text-white mb-4">Current User</h2>
        <div className="bg-emerald-500 bg-opacity-20 p-4 rounded-xl mb-4">
          <p className="text-white"><strong>Name:</strong> {user.name}</p>
          <p className="text-white"><strong>Email:</strong> {user.email}</p>
          <p className="text-white"><strong>Role:</strong> {user.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
        >
          Logout
        </button>
        {message && (
          <div className="mt-4 p-3 bg-black bg-opacity-30 rounded-lg">
            <p className="text-white">{message}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl border border-white border-opacity-20">
      <h2 className="text-3xl font-bold text-white mb-6 text-center">Demo Login Accounts</h2>
      <p className="text-slate-300 mb-8 text-center">Click any button below to test login with pre-created accounts:</p>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {DEMO_USERS.map((demoUser) => (
          <div key={demoUser.id} className="bg-black bg-opacity-30 p-4 rounded-xl border border-white border-opacity-20">
            <div className="mb-3">
              <h3 className="font-bold text-white">{demoUser.name}</h3>
              <p className="text-sm text-slate-300">{demoUser.email}</p>
              <p className="text-sm text-emerald-400 capitalize">{demoUser.role}</p>
            </div>
            <button
              onClick={() => handleDemoLogin(demoUser.email, demoUser.password)}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        ))}
      </div>

      {message && (
        <div className="p-4 bg-black bg-opacity-40 rounded-xl border border-white border-opacity-20">
          <p className="text-white text-center">{message}</p>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-500 bg-opacity-20 rounded-xl border border-blue-400 border-opacity-30">
        <h3 className="font-bold text-white mb-2">📋 Account Information</h3>
        <div className="text-sm text-slate-300 space-y-1">
          <p><strong>Admin:</strong> admin@cropguard.com / admin123</p>
          <p><strong>Agronomist:</strong> agronomist@cropguard.com / agro123</p>
          <p><strong>Farmer:</strong> farmer@cropguard.com / farmer123</p>
          <p><strong>Demo Users:</strong> All demo accounts use password "demo123"</p>
        </div>
      </div>
    </div>
  )
}