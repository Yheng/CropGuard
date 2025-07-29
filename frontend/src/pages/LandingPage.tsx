import { Link } from 'react-router-dom'
import { Leaf, Shield, TrendingUp } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#1F2A44] text-white">
      {/* Header */}
      <header className="border-b border-gray-600">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Leaf className="w-8 h-8 text-[#10B981]" />
              <h1 className="text-2xl font-bold">CropGuard</h1>
            </div>
            <nav className="flex items-center space-x-6">
              <a href="#features" className="hover:text-[#10B981] transition-colors">Features</a>
              <a href="#about" className="hover:text-[#10B981] transition-colors">About</a>
              <Link 
                to="/login" 
                className="text-[#10B981] hover:text-[#10B981]/80 transition-colors"
              >
                Sign In
              </Link>
              <Link 
                to="/signup" 
                className="bg-[#10B981] hover:bg-[#10B981]/80 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            AI-Powered Crop Protection
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Detect pests and diseases early with our intelligent analysis system. 
            Get organic treatment recommendations tailored for your crops.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/signup"
              className="bg-[#10B981] hover:bg-[#10B981]/80 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200 text-lg"
            >
              Start Free Trial
            </Link>
            <Link 
              to="/login"
              className="border border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200 text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-[#4A5B7C] rounded-lg p-6 shadow-lg border border-gray-600 text-center">
            <Shield className="w-12 h-12 text-[#10B981] mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Pest Detection</h3>
            <p className="text-gray-300">
              Advanced AI identifies pests and diseases with over 90% accuracy
            </p>
          </div>
          
          <div className="bg-[#4A5B7C] rounded-lg p-6 shadow-lg border border-gray-600 text-center">
            <Leaf className="w-12 h-12 text-[#2DD4BF] mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Organic Solutions</h3>
            <p className="text-gray-300">
              Get eco-friendly treatment recommendations for sustainable farming
            </p>
          </div>
          
          <div className="bg-[#4A5B7C] rounded-lg p-6 shadow-lg border border-gray-600 text-center">
            <TrendingUp className="w-12 h-12 text-[#10B981] mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Health Tracking</h3>
            <p className="text-gray-300">
              Monitor crop health trends and make data-driven decisions
            </p>
          </div>
        </div>

        {/* Status Section */}
        <div className="bg-[#4A5B7C] rounded-lg p-6 shadow-lg border border-gray-600 text-center">
          <h3 className="text-2xl font-semibold mb-4">System Status</h3>
          <div className="flex flex-wrap justify-center items-center gap-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#10B981] rounded-full"></div>
              <span>Frontend: Ready</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#10B981] rounded-full"></div>
              <span>Authentication: Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#F59E0B] rounded-full"></div>
              <span>Backend: In Development</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#2DD4BF] rounded-full"></div>
              <span>AI Integration: Planned</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-600 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-gray-400">
            <p>&copy; 2024 CropGuard. Built with React, Vite, and Tailwind CSS.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}