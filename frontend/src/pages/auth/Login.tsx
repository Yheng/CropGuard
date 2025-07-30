import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Eye, EyeOff } from 'lucide-react'
import { authService } from '../../services/auth'
import { clearAllAuthData } from '../../utils/authDebug'
// import { useAsyncAction } from '../../contexts/LoadingContext' // Temporarily disabled

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  // const { executeWithNavigation } = useAsyncAction() // Temporarily disabled

  // Redirect if already authenticated
  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate('/dashboard', { replace: true })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('Attempting login with:', email, password) // Debug log
      const result = await authService.login(email, password)
      console.log('Login successful:', result) // Debug log
      
      // Small delay to show loading animation
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 500)
    } catch (err) {
      console.error('Login error:', err) // Debug log
      setError(err instanceof Error ? err.message : 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1F2A44] flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Leaf className="w-12 h-12 text-[#10B981]" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">
            Sign in to CropGuard
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Or{' '}
            <Link
              to="/signup"
              className="font-medium text-[#10B981] hover:text-[#10B981]/80"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={(e) => {
          console.log('Form submitted!') // Debug log
          handleSubmit(e)
        }}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-[#4A5B7C] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-600 placeholder-gray-400 text-white bg-[#4A5B7C] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-[#10B981] focus:ring-[#10B981] border-gray-600 rounded bg-[#4A5B7C]"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-[#10B981] hover:text-[#10B981]/80">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                console.log('Button clicked!', { loading, email, password }) // Debug log
                if (!loading && email && password) {
                  handleSubmit(e)
                }
              }}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#10B981] hover:bg-[#10B981]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10B981] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="text-sm font-medium text-blue-400 mb-2">Demo Credentials</h3>
          <div className="space-y-2 text-xs text-blue-300">
            <div>
              <strong>Farmer:</strong> farmer@cropguard.com / farmer123
            </div>
            <div>
              <strong>Agronomist:</strong> agronomist@cropguard.com / agro123
            </div>
            <div>
              <strong>Admin:</strong> admin@cropguard.com / admin123
            </div>
          </div>
        </div>

        {/* Development Debug Section */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <h3 className="text-sm font-medium text-red-400 mb-2">Debug (Development Only)</h3>
            <p className="text-xs text-red-300 mb-3">
              If you're stuck at login, click below to clear all auth data:
            </p>
            <button
              onClick={() => {
                clearAllAuthData()
                window.location.reload()
              }}
              className="w-full px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Clear All Auth Data & Reload
            </button>
          </div>
        )}
      </div>
    </div>
  )
}