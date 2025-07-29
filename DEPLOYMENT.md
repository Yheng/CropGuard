# 🚀 CropGuard Deployment Guide

Complete deployment instructions for the CropGuard AI-powered crop protection application.

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- Git
- Domain name (for production)
- SSL certificate (for production)

## 🛠️ Local Development Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd CropGuard

# Install all dependencies
npm run install:all
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Copy environment file
cp .env.example .env

# Start backend server
npm run dev
```

Backend runs on: `http://localhost:3000`

### 3. Frontend Setup

```bash
# Navigate to frontend (new terminal)
cd frontend

# Start development server
npm run dev
```

Frontend runs on: `http://localhost:5173`

### 4. Test the Application

- Visit `http://localhost:5173`
- Use admin credentials: `admin@cropguard.com` / `admin123`
- Or create a new account through signup

## 🌐 Production Deployment

### Backend Deployment

#### Option 1: VPS/Dedicated Server

1. **Server Setup**
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   npm install -g pm2
   ```

2. **Deploy Backend**
   ```bash
   # Upload code to server
   git clone <repository-url>
   cd CropGuard/backend
   
   # Install dependencies
   npm ci --only=production
   
   # Set environment variables
   export NODE_ENV=production
   export JWT_SECRET=your-secure-secret-key
   export PORT=3000
   
   # Start with PM2
   pm2 start src/index.js --name "cropguard-api"
   pm2 startup
   pm2 save
   ```

3. **Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name api.cropguard.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

#### Option 2: Heroku

1. **Prepare for Heroku**
   ```bash
   cd backend
   
   # Create Procfile
   echo "web: node src/index.js" > Procfile
   
   # Ensure package.json has engines
   # "engines": {
   #   "node": ">=18.0.0",
   #   "npm": ">=9.0.0"
   # }
   ```

2. **Deploy to Heroku**
   ```bash
   # Install Heroku CLI and login
   heroku login
   
   # Create app
   heroku create cropguard-api
   
   # Set environment variables
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-secure-secret
   
   # Deploy
   git subtree push --prefix backend heroku main
   ```

#### Option 3: Railway/Render

Upload the backend folder and set environment variables through their web interface.

### Frontend Deployment

#### Option 1: Vercel (Recommended)

1. **Prepare for Vercel**
   ```bash
   cd frontend
   
   # Create vercel.json
   cat > vercel.json << EOF
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   EOF
   
   # Set API URL in .env.production
   echo "VITE_API_URL=https://your-api-domain.com/api" > .env.production
   ```

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and deploy
   vercel login
   vercel --prod
   ```

#### Option 2: Netlify

1. **Build the project**
   ```bash
   cd frontend
   npm run build
   ```

2. **Upload dist folder to Netlify or connect Git repository**

3. **Set environment variables in Netlify dashboard:**
   - `VITE_API_URL=https://your-api-domain.com/api`

#### Option 3: Static Hosting (S3, GitHub Pages)

```bash
cd frontend
npm run build

# Upload dist/ folder contents to your static hosting
```

## 🔧 Environment Configuration

### Backend Environment Variables

```bash
# Production .env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend-domain.com
DB_PATH=/app/data/cropguard.db
```

### Frontend Environment Variables

```bash
# .env.production
VITE_API_URL=https://your-api-domain.com/api
```

## 🗄️ Database Setup

### Development (SQLite)
- Automatically created on first run
- Located at `backend/data/cropguard.db`

### Production Options

#### Option 1: Keep SQLite
```bash
# Ensure data directory exists and is writable
mkdir -p /app/data
chmod 755 /app/data
```

#### Option 2: Migrate to PostgreSQL
```bash
# Install PostgreSQL adapter
npm install pg

# Update database configuration in backend
# (Requires code modifications for PostgreSQL)
```

## 🔒 Security Checklist

### Backend Security
- [x] JWT secret set to secure random string
- [x] Rate limiting enabled
- [x] CORS configured for specific frontend domain
- [x] File upload validation
- [x] Input validation with Joi
- [x] Password hashing with bcrypt
- [x] Helmet security headers
- [x] Request logging

### Frontend Security
- [x] API URL properly configured
- [x] No sensitive data in environment variables
- [x] HTTPS enforced in production

### Production Security
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Database backups scheduled
- [ ] Monitoring set up
- [ ] Error logging configured

## 📊 Monitoring & Maintenance

### Health Checks
- Backend: `GET /health`
- Returns server status and version

### Logs
- Backend logs: Check PM2 logs or application logs
- Frontend: Browser console and network tab

### Database Backup
```bash
# Backup SQLite database
cp /path/to/cropguard.db /backup/location/cropguard-$(date +%Y%m%d).db
```

### Updates
```bash
# Update backend
cd backend
git pull origin main
npm ci --only=production
pm2 reload cropguard-api

# Update frontend
cd frontend
git pull origin main
npm run build
# Upload new build to hosting
```

## 🧪 Testing Deployment

### Backend Tests
```bash
# Health check
curl https://your-api-domain.com/health

# Authentication test
curl -X POST https://your-api-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cropguard.com","password":"admin123"}'
```

### Frontend Tests
1. Visit your frontend URL
2. Test user registration/login
3. Upload a test image for analysis
4. Check analytics dashboard
5. Verify all navigation works

## 🚨 Troubleshooting

### Common Issues

#### Backend won't start
- Check Node.js version (18+)
- Verify environment variables
- Check port availability
- Review error logs

#### Database errors
- Ensure data directory exists and is writable
- Check file permissions
- Verify disk space

#### CORS errors
- Verify FRONTEND_URL in backend .env
- Check API URL in frontend .env
- Ensure both use same protocol (http/https)

#### File upload fails
- Check upload directory permissions
- Verify file size limits
- Test with smaller images

### Getting Help
1. Check application logs
2. Verify environment variables
3. Test API endpoints directly
4. Check network connectivity
5. Review browser console errors

## 🎯 Performance Optimization

### Backend
- Use PM2 cluster mode for multiple cores
- Implement Redis caching
- Optimize database queries
- Add CDN for static files

### Frontend
- Enable gzip compression
- Use CDN for assets
- Implement lazy loading
- Optimize images

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer (Nginx, CloudFlare)
- Multiple backend instances
- Shared database
- File storage (S3, CloudFront)

### Database Scaling
- PostgreSQL with read replicas
- Connection pooling
- Query optimization
- Data archiving

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy CropGuard
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy Backend
        # Add deployment steps
      - name: Deploy Frontend
        # Add deployment steps
```

---

🎉 **Congratulations!** Your CropGuard application is now deployed and ready to help farmers with AI-powered crop protection!