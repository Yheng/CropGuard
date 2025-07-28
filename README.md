# CropGuard - AI-Powered Crop Protection

CropGuard is a comprehensive web application designed for small-scale organic farmers and agronomists to detect pests and diseases using AI, receive organic treatment recommendations, and track crop health trends.

## 🚀 Project Overview

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express (planned)
- **AI Integration**: OpenAI Vision API (planned)
- **Database**: SQLite for MVP, PostgreSQL for scale
- **Deployment**: Cloud platform (AWS/Vercel)

## 📁 Project Structure

```
CropGuard/
├── frontend/           # React application
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/      # Page components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── services/   # API services
│   │   ├── types/      # TypeScript types
│   │   ├── utils/      # Utility functions
│   │   └── assets/     # Images, icons
│   ├── public/         # Static assets
│   └── dist/           # Built application
├── backend/            # Node.js API server
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── tests/
├── shared/             # Shared types and utilities
│   └── src/
│       ├── types/
│       ├── constants/
│       └── utils/
├── docs/               # Documentation
└── personal/           # Project specifications
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite 6** - Fast build tool and dev server
- **TypeScript** - Type safety and better DX
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **ApexCharts** - Interactive charts
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Icon library

### Backend (Planned)
- **Node.js + Express** - Server runtime and framework
- **SQLite** - Database for MVP
- **Redis** - Caching layer
- **JWT** - Authentication
- **Multer** - File upload handling
- **Sharp** - Image processing

### AI & External Services
- **OpenAI Vision API** - Primary AI model
- **Python Service** - Image preprocessing

## 🎨 Design System

The application uses a dark theme with the following color palette:

- **Primary**: Dark Gray (#1F2A44) - Main background
- **Accent Green**: #10B981 - Primary buttons and highlights
- **Accent Teal**: #2DD4BF - Charts and secondary elements
- **Alert Orange**: #F59E0B - Warnings and alerts

Typography uses the Inter font family for optimal readability.

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm 9+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CropGuard
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Frontend
   cd frontend
   cp .env.example .env
   
   # Backend (when ready)
   cd ../backend  
   cp .env.example .env
   ```

4. **Start development server**
   ```bash
   # From root directory
   npm run dev
   
   # Or specifically frontend
   npm run dev:frontend
   ```

5. **Open in browser**
   - Frontend: http://localhost:5173
   - Backend API (when ready): http://localhost:3000

## 📱 Features

### For Farmers
- **Image Upload**: Upload crop images via camera or gallery
- **AI Analysis**: Get pest/disease identification with confidence scores
- **Treatment Recommendations**: Receive organic treatment suggestions
- **Crop Health Tracking**: View trends and charts over time
- **Offline Support**: Store images locally, sync when connected

### For Agronomists
- **Review Dashboard**: Review and validate AI analyses
- **Bulk Operations**: Approve/reject multiple analyses
- **Expert Comments**: Add professional insights
- **Credit System**: Earn credits for reviews

### For Administrators
- **User Management**: Add/remove farmers and agronomists
- **AI Configuration**: Update API keys and model settings
- **Audit Logs**: Monitor system usage and actions
- **System Analytics**: Track performance metrics

## 🔧 Development Scripts

```bash
# Root level commands
npm run dev              # Start frontend dev server
npm run build            # Build frontend for production
npm run dev:frontend     # Start frontend explicitly
npm run dev:backend      # Start backend (when implemented)
npm run install:all      # Install all workspace dependencies
npm run clean            # Clean all node_modules and build dirs

# Frontend specific (in frontend/)
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint

# Backend specific (in backend/ - when implemented)
npm run dev              # Start with nodemon
npm run start            # Start production server
npm run test             # Run tests
```

## 🧪 Testing

Testing setup is prepared for:
- **Frontend**: Vitest + React Testing Library
- **Backend**: Jest + Supertest
- **E2E**: Playwright (planned)

## 📊 Performance Goals

- **Page Load Time**: < 2 seconds
- **API Response Time**: < 5 seconds
- **AI Analysis**: < 10 seconds
- **Chart Rendering**: < 2 seconds
- **Mobile-First**: Optimized for Android devices

## 🔒 Security & Privacy

- **Data Encryption**: All sensitive data encrypted
- **JWT Authentication**: Secure token-based auth
- **API Rate Limiting**: Prevent abuse
- **GDPR Compliance**: Privacy-first approach
- **Image Processing**: Client-side validation

## 📈 Roadmap

### Phase 1 - MVP (Current)
- [x] Project setup and structure
- [x] Frontend foundation with React + Vite
- [x] Design system and Tailwind configuration
- [x] Component architecture
- [ ] Basic UI components
- [ ] Image upload functionality
- [ ] Backend API development
- [ ] AI integration

### Phase 2 - Core Features
- [ ] User authentication
- [ ] Real-time analysis
- [ ] Treatment recommendations
- [ ] Basic charts and trends

### Phase 3 - Advanced Features
- [ ] Offline functionality
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Mobile app (React Native)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For questions or support, please contact the CropGuard team or create an issue in this repository.

---

Built with ❤️ for sustainable farming and crop protection.