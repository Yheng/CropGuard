import { Link } from 'react-router-dom'
import { 
  Leaf, Shield, Camera, BarChart3, Menu, X, Star, CheckCircle, 
  Award, Smartphone, Users, Zap, Globe
} from 'lucide-react'
import { useState } from 'react'

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-x-hidden">
      {/* Modern Navigation */}
      <nav className="relative z-50 backdrop-blur-xl bg-black bg-opacity-20 border-b border-white border-opacity-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-xl">
                <Leaf className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-emerald-400">CropGuard</h1>
                <p className="text-sm text-emerald-300 opacity-80">AI-Powered Agriculture</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <a href="#features" className="text-slate-300 hover:text-emerald-400 transition-colors font-medium">Features</a>
              <a href="#benefits" className="text-slate-300 hover:text-emerald-400 transition-colors font-medium">Benefits</a>
              <a href="#testimonials" className="text-slate-300 hover:text-emerald-400 transition-colors font-medium">Success Stories</a>
              <Link to="/login" className="text-slate-300 hover:text-emerald-400 transition-colors font-medium">Sign In</Link>
              <Link 
                to="/signup" 
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transform hover:scale-105 transition-all shadow-lg"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Mobile menu button */}
            <button 
              className="lg:hidden p-2 text-slate-300 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-white border-opacity-10 py-4">
              <div className="space-y-4">
                <a href="#features" className="block text-slate-300 hover:text-emerald-400 py-2">Features</a>
                <a href="#benefits" className="block text-slate-300 hover:text-emerald-400 py-2">Benefits</a>
                <a href="#testimonials" className="block text-slate-300 hover:text-emerald-400 py-2">Success Stories</a>
                <Link to="/login" className="block text-slate-300 hover:text-emerald-400 py-2">Sign In</Link>
                <Link 
                  to="/signup" 
                  className="block w-full text-center bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold mt-4"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-3 bg-black bg-opacity-20 px-6 py-3 rounded-full mb-8 backdrop-blur-sm">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="text-white font-semibold">Winner • AgTech Innovation Award 2024</span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-8 leading-tight">
            <span className="block text-white mb-4">AI-Powered Precision</span>
            <span className="block text-emerald-400">Crop Protection</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed">
            Increase yields by <span className="text-emerald-400 font-bold text-3xl">35%</span> and reduce pesticide costs by <span className="text-emerald-400 font-bold text-3xl">60%</span> with AI-powered pest detection and organic treatment recommendations.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            <div className="text-center bg-black bg-opacity-20 px-6 py-4 rounded-2xl backdrop-blur-sm">
              <div className="text-4xl font-black text-emerald-400 mb-2">95%</div>
              <div className="text-slate-300 font-semibold">AI Accuracy</div>
            </div>
            <div className="text-center bg-black bg-opacity-20 px-6 py-4 rounded-2xl backdrop-blur-sm">
              <div className="text-4xl font-black text-emerald-400 mb-2">10,000+</div>
              <div className="text-slate-300 font-semibold">Farmers Served</div>
            </div>
            <div className="text-center bg-black bg-opacity-20 px-6 py-4 rounded-2xl backdrop-blur-sm">
              <div className="text-4xl font-black text-emerald-400 mb-2">35%</div>
              <div className="text-slate-300 font-semibold">Yield Increase</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Link 
              to="/signup"
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:from-emerald-600 hover:to-green-700 transform hover:scale-105 transition-all shadow-xl inline-flex items-center justify-center gap-3"
            >
              <Camera className="w-6 h-6" />
              Start Analyzing Crops
            </Link>
            <Link 
              to="/login"
              className="bg-black bg-opacity-30 border-2 border-white border-opacity-30 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-opacity-40 hover:border-emerald-400 transition-all shadow-xl inline-flex items-center justify-center gap-3"
            >
              <Users className="w-6 h-6" />
              View Live Demo
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center items-center gap-6">
            <div className="flex items-center gap-2 bg-black bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-slate-300 font-medium">USDA Organic Certified</span>
            </div>
            <div className="flex items-center gap-2 bg-black bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-slate-300 font-medium">Data Security Compliant</span>
            </div>
            <div className="flex items-center gap-2 bg-black bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span className="text-slate-300 font-medium">Works Offline</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-6 text-white">Advanced Features</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Revolutionary AI technology designed specifically for small-scale organic farmers
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-black bg-opacity-30 rounded-2xl p-8 backdrop-blur-sm hover:bg-opacity-40 transition-all group">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-emerald-400 transition-colors">Instant Pest Detection</h3>
              <p className="text-slate-300 leading-relaxed mb-6">
                Take a photo and get immediate AI-powered identification of pests, diseases, and nutrient deficiencies with 95% accuracy.
              </p>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span>50+ pest species detection</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span>Disease severity scoring</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span>Works offline</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-black bg-opacity-30 rounded-2xl p-8 backdrop-blur-sm hover:bg-opacity-40 transition-all group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform">
                <Leaf className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-green-400 transition-colors">Organic Solutions</h3>
              <p className="text-slate-300 leading-relaxed mb-6">
                Receive eco-friendly treatment recommendations from certified agricultural experts, tailored to your specific crops and region.
              </p>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>100% organic treatments</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Expert agronomist review</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Cost-effective solutions</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-black bg-opacity-30 rounded-2xl p-8 backdrop-blur-sm hover:bg-opacity-40 transition-all group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors">Predictive Analytics</h3>
              <p className="text-slate-300 leading-relaxed mb-6">
                Track crop health trends, predict potential issues, and make data-driven decisions to maximize your harvest yields.
              </p>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <span>Historical trend analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <span>Predictive modeling</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <span>ROI optimization</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-6 text-white">Proven Results</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Real farmers are seeing dramatic improvements in crop yields and cost savings
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center bg-black bg-opacity-30 rounded-2xl p-8 backdrop-blur-sm hover:bg-opacity-40 transition-all group">
              <div className="text-6xl font-black text-emerald-400 mb-4 group-hover:scale-110 transition-transform">35%</div>
              <div className="text-2xl font-bold text-white mb-2">Yield Increase</div>
              <div className="text-slate-300">Average crop yield improvement within first season</div>
            </div>
            <div className="text-center bg-black bg-opacity-30 rounded-2xl p-8 backdrop-blur-sm hover:bg-opacity-40 transition-all group">
              <div className="text-6xl font-black text-green-400 mb-4 group-hover:scale-110 transition-transform">60%</div>
              <div className="text-2xl font-bold text-white mb-2">Cost Reduction</div>
              <div className="text-slate-300">Savings on pesticides and treatment costs</div>
            </div>
            <div className="text-center bg-black bg-opacity-30 rounded-2xl p-8 backdrop-blur-sm hover:bg-opacity-40 transition-all group">
              <div className="text-6xl font-black text-blue-400 mb-4 group-hover:scale-110 transition-transform">48hrs</div>
              <div className="text-2xl font-bold text-white mb-2">Faster Detection</div>
              <div className="text-slate-300">Earlier pest identification vs traditional methods</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-6 text-white">Success Stories</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Hear from farmers who transformed their operations with CropGuard
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-black bg-opacity-30 rounded-2xl p-8 backdrop-blur-sm hover:bg-opacity-40 transition-all">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-300 mb-6 leading-relaxed">
                "CropGuard helped me identify tomato blight 2 weeks earlier than I would have noticed. Saved my entire crop and increased my yield by 40%."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold">MJ</span>
                </div>
                <div>
                  <div className="font-semibold text-white">Maria Johnson</div>
                  <div className="text-sm text-emerald-400">Organic Tomato Farm • California</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-black bg-opacity-30 rounded-2xl p-8 backdrop-blur-sm hover:bg-opacity-40 transition-all">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-300 mb-6 leading-relaxed">
                "The organic treatment recommendations are spot-on. I've reduced my pesticide costs by 70% while maintaining healthy crops."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold">DS</span>
                </div>
                <div>
                  <div className="font-semibold text-white">David Smith</div>
                  <div className="text-sm text-green-400">Corn & Soybean • Iowa</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-black bg-opacity-30 rounded-2xl p-8 backdrop-blur-sm hover:bg-opacity-40 transition-all">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-300 mb-6 leading-relaxed">
                "Finally, a farming app that actually works offline! Perfect for our remote location. The AI predictions are incredibly accurate."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold">SP</span>
                </div>
                <div>
                  <div className="font-semibold text-white">Sarah Peterson</div>
                  <div className="text-sm text-blue-400">Mixed Vegetable • Montana</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-6 text-white">Ready to Transform Your Farm?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Join 10,000+ farmers already using AI to protect their crops and increase yields
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link 
              to="/signup"
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-green-700 transform hover:scale-105 transition-all shadow-xl"
            >
              Start Free Trial Today
            </Link>
            <Link 
              to="/login"
              className="bg-black bg-opacity-30 border-2 border-white border-opacity-30 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-opacity-40 hover:border-emerald-400 transition-all shadow-xl"
            >
              Watch Demo Video
            </Link>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">30-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white border-opacity-10 py-16 px-6 lg:px-8 bg-black bg-opacity-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-emerald-400">CropGuard</span>
              </div>
              <p className="text-slate-400 leading-relaxed mb-4">
                AI-powered crop protection for sustainable farming. Empowering farmers with technology.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Globe className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Users className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">API Access</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Mobile App</a></li>
              </ul>
            </div>

            {/* Support Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Contact Expert</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Training</a></li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white border-opacity-10 pt-8 text-center">
            <p className="text-slate-400">
              © 2024 CropGuard. Licensed under GPL-3.0. Built with ❤️ for sustainable farming.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}