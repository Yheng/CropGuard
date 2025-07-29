# 🌾 CropGuard
### *AI-Powered Crop Protection for Sustainable Farming*

<div align="center">

![CropGuard Banner](https://img.shields.io/badge/CropGuard-AI%20Crop%20Protection%20Platform-emerald?style=for-the-badge&logo=leaf&logoColor=white)

[![React](https://img.shields.io/badge/React-19.1+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.0+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-5.1+-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![AI Powered](https://img.shields.io/badge/AI-Powered-FF6B6B?style=flat-square&logo=openai&logoColor=white)](https://openai.com/)

![Visitor Count](https://visitor-badge.laobi.icu/badge?page_id=CropGuard.Agricultural&left_color=green&right_color=emerald&left_text=Visitors)

*Empowering small-scale organic farmers with AI-powered pest detection, organic treatment recommendations, and comprehensive crop health analytics.*

</div>

---

## 🌟 **Overview**

**CropGuard** is a comprehensive, offline-first web application designed specifically for small-scale organic farmers and agricultural professionals in rural areas. Built with cutting-edge technology, it provides AI-powered crop disease detection, organic treatment recommendations, and comprehensive crop health analytics - all while working seamlessly in low-connectivity environments.

### 🎯 **Why CropGuard?**

- **🤖 AI-Powered Detection**: Multi-model crop disease identification with 95% accuracy
- **📊 Advanced Analytics**: Interactive charts and crop health insights
- **📱 Offline-First**: Full functionality without internet connectivity
- **🌿 Organic-Focused**: 100% eco-friendly treatment recommendations
- **🔒 Privacy-First**: Farmer data belongs to farmers
- **🎯 Mobile-Optimized**: Perfect for Android devices in rural areas
- **🏆 Expert Review**: Certified agronomist validation system

---

## ✨ **Key Features**

### 🌱 **For Farmers (Mobile-Optimized)**
- 📸 **Smart Image Capture** - Optimized camera interface with crop-specific capture guides
- 🤖 **AI-Powered Analysis** - Multi-model disease detection with confidence scoring
- 🌿 **Organic Treatment Plans** - Personalized, eco-friendly treatment recommendations
- 📊 **Crop Health Dashboard** - Visual trends and analytics with touch-friendly charts
- 📱 **Offline-First Operation** - Full functionality without internet connectivity
- 🎯 **Touch-Optimized UI** - Large buttons, gesture navigation, thumb-friendly design
- 🌙 **Dark Mode** - Optimized for early morning and late evening farm work

### 👨‍🌾 **For Agronomists (Professional Tools)**
- 📋 **Case Management Dashboard** - Comprehensive overview of farmer submissions
- ⚡ **Bulk Review Operations** - Efficient approval/rejection workflows
- 💬 **Expert Communication** - Direct messaging with farmers and recommendations
- 🏆 **Gamified Credit System** - Earn points for quality reviews and timely responses
- 📈 **Regional Analytics** - Area-wide crop health insights and trend analysis
- 🔍 **Advanced Filtering** - Search and filter cases by crop type, severity, location

### 🛡️ **For Administrators (System Management)**
- 👥 **User Management** - Role-based access control and account administration
- 🔧 **AI Model Configuration** - Update API keys, adjust confidence thresholds
- 📝 **Comprehensive Audit Logs** - Full system activity tracking and compliance
- 📊 **System Analytics** - Performance monitoring, usage statistics, cost tracking
- 🌍 **Geographic Insights** - Regional usage patterns and crop health mapping

---

## 🚀 **Technology Stack**

<div align="center">

### **Frontend Arsenal**
![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7.0.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.23.11-0055FF?style=for-the-badge&logo=framer&logoColor=white)

### **Backend Powerhouse**
![Node.js](https://img.shields.io/badge/Node.js-18.0+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4.18.2-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-5.1.6-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-9.0.2-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

### **AI & Visualization**
![OpenAI](https://img.shields.io/badge/OpenAI-Vision%20API-412991?style=for-the-badge&logo=openai&logoColor=white)
![ApexCharts](https://img.shields.io/badge/ApexCharts-5.3.1-FF6B6B?style=for-the-badge&logo=chart-dot-js&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-4.6.7-DC382D?style=for-the-badge&logo=redis&logoColor=white)

</div>

---

## ⚡ **Quick Start Guide**

### 🔧 **Prerequisites**
- Node.js 18.0+ 
- npm 9+ package manager
- Git (for cloning)

### 💻 **Local Development Setup**

```bash
# 📥 Clone the repository
git clone https://github.com/your-org/cropguard.git
cd CropGuard

# 📦 Install all dependencies
npm run install:all

# 🔑 Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# ✏️ Edit .env files with your configuration
# Required: JWT_SECRET, OPENAI_API_KEY, REDIS_URL (optional)

# 🗄️ Seed the database with demo accounts
cd backend
npm run seed:full

# 🚀 Start development servers
cd ..
npm run dev

# 🌐 Access your application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# Health Check: http://localhost:3000/api/health
```

### 👑 **Default Admin Access**
```
📧 Email: admin@cropguard.com
🔑 Password: admin123
⚠️ Change these credentials immediately after first login!
```

### 👤 **Demo User Accounts**
```
🌾 Farmer: farmer@cropguard.com / farmer123
👨‍🌾 Agronomist: agronomist@cropguard.com / agro123
🌾 Maria Garcia: maria.garcia@farmland.com / demo123
🌾 David Kim: david.kim@organicfarms.com / demo123
🔬 Dr. Lisa Brown: lisa.brown@soilexperts.com / demo123
```

---

## 🏗️ **Project Architecture**

<details>
<summary><b>📁 Project Structure (Click to expand)</b></summary>

```
CropGuard/
├── 📋 README.md
├── 📦 package.json                 # Workspace configuration
├── 🎨 frontend/                    # React SPA
│   ├── 📦 package.json
│   ├── ⚡ vite.config.ts
│   ├── 🎨 tailwind.config.js
│   └── 📁 src/
│       ├── 🚀 main.tsx             # App entry point
│       ├── 🏠 App.tsx              # Main component
│       ├── 🎨 index.css            # Global styles
│       ├── 🧩 components/          # Reusable components
│       │   ├── 🧭 navigation/      # Navigation systems
│       │   ├── 🎨 ui/              # UI design system
│       │   ├── 📊 charts/          # Data visualization
│       │   ├── 📷 upload/          # Image upload & compression
│       │   ├── 🔄 offline/         # Offline-first components
│       │   └── 🏆 workflow/        # Analysis workflow
│       ├── 📄 pages/               # Page components by role
│       │   ├── 👨‍🌾 farmer/          # Farmer dashboard
│       │   ├── 👨‍🎓 agronomist/      # Agronomist portal
│       │   ├── 👑 admin/           # Administrator dashboard
│       │   ├── 🔐 auth/            # Authentication pages
│       │   └── 🏠 LandingPage.tsx  # Professional landing page
│       ├── 🌐 contexts/            # React Context providers
│       │   ├── 🎨 ThemeContext.tsx # Dark/light theme
│       │   └── 🏑 FieldModeContext.tsx # Field optimization
│       ├── 🪝 hooks/               # Custom React hooks
│       │   ├── 📊 useActivityTracking.ts
│       │   ├── 🌐 useConnectionState.ts
│       │   ├── 🔄 useOfflineSync.ts
│       │   └── 📊 useFieldMetrics.ts
│       ├── 🛠️ services/            # API integrations
│       │   ├── 🔐 auth.ts          # Authentication service
│       │   ├── 🌤️ weather.ts        # Weather integration
│       │   └── 📳 haptics.ts       # Mobile haptic feedback
│       └── 🛠️ utils/               # Utility functions
├── 🖥️ backend/                     # Express API Server
│   ├── 📦 package.json
│   ├── 🚀 src/index.js             # Main server
│   ├── 🔑 .env.example             # Environment template
│   └── 📁 src/
│       ├── 🗄️ models/              # Database models
│       ├── 🛣️ routes/              # API endpoints
│       │   ├── 👤 auth.js          # Authentication routes
│       │   ├── 📊 analytics.js     # Analytics endpoints
│       │   ├── 📷 upload.js        # Image upload handling
│       │   └── 🤖 ai-analysis.js   # AI analysis routes
│       ├── 🛡️ middleware/          # Express middleware
│       │   ├── 🔐 auth.js          # JWT validation
│       │   ├── ❌ errorHandler.js  # Error handling
│       │   └── 📊 rateLimiter.js   # API rate limiting
│       ├── 🛠️ utils/               # Backend utilities
│       │   ├── 🗄️ seedDatabase.js  # Database seeding
│       │   └── 🤖 aiService.js     # AI integration
│       └── 📜 scripts/             # Utility scripts
│           └── 🌱 seed.js          # Seeding CLI tool
```

</details>

---

## 🔌 **API Documentation**

### 🔐 **Authentication**
All protected endpoints require JWT token:
```http
Authorization: Bearer <your-jwt-token>
```

<details>
<summary><b>👤 Authentication Endpoints</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | 📝 Register new user |
| `POST` | `/api/auth/login` | 🔐 User authentication |
| `POST` | `/api/auth/logout` | 🚪 User logout |
| `GET` | `/api/auth/profile` | 👤 Get user profile |
| `PUT` | `/api/auth/profile` | ✏️ Update user profile |

</details>

<details>
<summary><b>📊 Analytics Endpoints</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/dashboard` | 📈 Dashboard analytics |
| `GET` | `/api/analytics/crop-health` | 🌱 Crop health trends |
| `GET` | `/api/analytics/treatment-effectiveness` | 💊 Treatment success rates |
| `GET` | `/api/analytics/regional` | 🌍 Regional crop insights |

</details>

<details>
<summary><b>🤖 AI Analysis Endpoints</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/analyze-image` | 📸 Submit crop image for AI analysis |
| `GET` | `/api/ai/analysis/:id` | 🔍 Get analysis results |
| `POST` | `/api/ai/treatment-recommendation` | 💡 Get organic treatment suggestions |

</details>

---

## 🛡️ **Security Features**

<div align="center">

| 🔒 **Feature** | 📋 **Implementation** |
|----------------|----------------------|
| **Password Security** | bcrypt with 12 salt rounds |
| **Authentication** | JWT with configurable expiration |
| **Data Encryption** | End-to-end encryption for sensitive data |
| **Input Validation** | Comprehensive sanitization |
| **API Rate Limiting** | 100 requests/15min per IP |
| **CORS Protection** | Restricted to frontend domain |
| **Offline Security** | Encrypted local storage |
| **GDPR Compliance** | Full data portability and deletion |

</div>

---

## 🚀 **Advanced Features**

### 🤖 **AI Integration**
- **Multi-Model Analysis**: OpenAI Vision API with confidence scoring
- **Crop-Specific Detection**: 50+ pest and disease identification
- **Treatment Recommendations**: Organic, eco-friendly solutions
- **Confidence Thresholds**: Quality control for AI predictions
- **Expert Validation**: Agronomist review system

### 📱 **Offline-First Architecture**
- **Service Workers**: Background sync and caching strategies
- **IndexedDB**: Client-side database for offline data storage
- **Progressive Sync**: Intelligent synchronization when connected
- **Conflict Resolution**: Automatic handling of data conflicts
- **Connection State**: Real-time connectivity monitoring

### 📊 **Analytics & Insights**
- **Interactive Charts**: ApexCharts visualizations with Framer Motion
- **Trend Analysis**: Long-term crop health patterns
- **ROI Tracking**: Treatment cost vs. yield improvement
- **Regional Insights**: Geographic crop health mapping
- **Performance Metrics**: System usage and effectiveness tracking

### 🎨 **Design System**
- **Mobile-First**: Touch-optimized for Android devices
- **Dark/Light Themes**: System preference detection
- **Agricultural Colors**: Semantic color palette for crop health
- **Typography**: Inter font optimized for readability
- **Animations**: Smooth micro-interactions with Framer Motion

---

## 📸 **Screenshots**

<div align="center">
<table>
<tr>
<td align="center" width="50%">
<img src="images/landing-page.jpg" alt="Landing Page" width="100%"/>
<b>Professional Landing Page</b>
</td>
<td align="center" width="50%">
<img src="images/farmer-dashboard.jpg" alt="Farmer Dashboard" width="100%"/>
<b>Farmer Dashboard</b>
</td>
</tr>
<tr>
<td align="center" width="50%">
<img src="images/ai-analysis.jpg" alt="AI Analysis" width="100%"/>
<b>AI-Powered Crop Analysis</b>
</td>
<td align="center" width="50%">
<img src="images/treatment-plans.jpg" alt="Treatment Plans" width="100%"/>
<b>Organic Treatment Plans</b>
</td>
</tr>
<tr>
<td align="center" width="50%">
<img src="images/agronomist-portal.jpg" alt="Agronomist Portal" width="100%"/>
<b>Agronomist Review Portal</b>
</td>
<td align="center" width="50%">
<img src="images/analytics-dashboard.jpg" alt="Analytics Dashboard" width="100%"/>
<b>Advanced Analytics</b>
</td>
</tr>
</table>
</div>

> **Note**: Screenshots will be added soon. The application features a modern, professional design optimized for agricultural professionals.

---

## 🌐 **Deployment Options**

### 🔧 **Production Build**
```bash
# 🏗️ Build frontend
npm run build:frontend

# 🚀 Build backend
npm run build:backend

# 🌐 Start production server
NODE_ENV=production npm start
```

### 🔑 **Environment Configuration**
```env
NODE_ENV=production
JWT_SECRET=your-ultra-secure-jwt-secret-256-bits
OPENAI_API_KEY=your-openai-api-key
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://your-domain.com
RATE_LIMIT_MAX=100
```

### 🗄️ **Database Setup**
```bash
# 🌱 Seed production database
npm run seed:accounts      # Create default accounts only
npm run seed:full         # Full demo data (development)
npm run seed:clear        # Clear all data
npm run seed:reset        # Reset database
```

---

## 🤝 **Contributing**

We welcome contributions from developers, agronomists, and farming professionals! Here's how to get involved:

### 🛠️ **Development Workflow**
1. 🍴 Fork the repository
2. 🌿 Create feature branch (`git checkout -b feature/crop-improvement`)
3. 📝 Make documented changes with comprehensive tests
4. ✅ Ensure all tests pass and lint checks succeed
5. 📤 Submit pull request with detailed description

### 📋 **Code Standards**
- **Documentation**: Comprehensive comments and README updates
- **Testing**: Unit tests for new features
- **Security**: Follow agricultural data privacy best practices
- **Performance**: Optimize for rural connectivity conditions
- **Accessibility**: WCAG 2.1 AA compliance

---

## 📄 **License**

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

### What this means:
- ✅ **Commercial Use**: You can use this software commercially
- ✅ **Modification**: You can modify the source code
- ✅ **Distribution**: You can distribute the software
- ✅ **Patent Use**: You can use patents from contributors
- ✅ **Private Use**: You can use and modify the software privately

### Requirements:
- 📝 **License Notice**: Include the original license and copyright notice
- 📂 **Source Code**: Must provide source code when distributing
- 📋 **State Changes**: Must document changes made to the code
- 🔄 **Same License**: Derivative work must be under the same license

This ensures that CropGuard remains free and open-source software that benefits the global farming community while maintaining transparency and collaborative development.

---

## 👨‍💻 **Author & Support**

<div align="center">

### **🎨 Created with ❤️ by Ariel Retes**

[![Email](https://img.shields.io/badge/Email-yhengdesigns@gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:yhengdesigns@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-Follow%20Me-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Yheng)

### ☕ **Support This Project**

<a href="https://buymeacoffee.com/arielretes" target="_blank">
  <img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support%20Development-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee" />
</a>

*If CropGuard helped improve your farming operations or inspired your own agricultural technology project, consider buying me a coffee! Your support helps me continue developing innovative solutions for sustainable farming.* ☕🌾

</div>

### 💬 **Get Support**

- 🐛 **Bug Reports**: [Create an Issue](https://github.com/your-org/cropguard/issues)
- 💡 **Feature Requests**: [Start a Discussion](https://github.com/your-org/cropguard/discussions)
- 🔒 **Security Issues**: Report privately via email
- 📧 **General Questions**: [yhengdesigns@gmail.com](mailto:yhengdesigns@gmail.com)

---

## 🏆 **Project Highlights**

<div align="center">

This application showcases:

**🌾 Agricultural Technology** • **🤖 AI Integration** • **📱 Mobile-First Design**
**🔄 Offline-First Architecture** • **🛡️ Security Excellence** • **📊 Data Visualization**

*Demonstrates how innovative technical solutions can make a meaningful impact in sustainable agriculture and rural farming communities.*

### 🌟 **Star this project if it helped you!** 🌟

*CropGuard: Empowering farmers with AI, one crop at a time.*

### ☕ **Did CropGuard help your farming operations?**

**If this project improved your crop yields, saved you time, or served as inspiration for your own agricultural technology work, consider supporting its continued development:**

<a href="https://buymeacoffee.com/arielretes" target="_blank">
  <img src="https://img.shields.io/badge/☕%20Buy%20Me%20A%20Coffee-Support%20Agricultural%20Innovation-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee" />
</a>

*Your contribution helps me dedicate more time to creating impactful agricultural technology solutions for farmers worldwide! 🚀🌾*

---

[![GPL-3.0 License](https://img.shields.io/badge/License-GPL--3.0-green.svg)](https://choosealicense.com/licenses/gpl-3.0/)
[![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️%20for%20Farmers-green.svg)](https://github.com/your-org/cropguard)
[![Buy Me A Coffee](https://img.shields.io/badge/☕-Support%20Project-FFDD00?style=flat-square&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/arielretes)

</div>

---

## 🌾 **About CropGuard**

**Built with ❤️ for sustainable farming and crop protection.**

CropGuard represents the intersection of modern technology and traditional farming wisdom. By making AI-powered crop protection accessible to small-scale farmers worldwide, we're working toward a future where technology serves agriculture's most fundamental needs.

*"Transforming agriculture through AI-powered innovation, one farm at a time."*

### 🎯 **Our Mission**
To provide small-scale organic farmers with professional-grade crop protection tools that work offline, respect their data privacy, and help them make informed decisions about their crops.

### 🌱 **Our Values**
- **Accessibility**: Technology should be available to all farmers, regardless of location or resources
- **Privacy**: Farmer data belongs to farmers
- **Sustainability**: Supporting organic and environmentally conscious farming practices
- **Community**: Building bridges between farmers, agronomists, and technology
- **Innovation**: Continuously improving agricultural outcomes through cutting-edge solutions