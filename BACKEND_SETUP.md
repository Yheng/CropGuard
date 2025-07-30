# CropGuard Backend Setup Guide

## Current Issue: 
Your frontend is running in **demo mode**, which means new user registrations are only saved to browser localStorage and get lost when you clear browser data or logout.

## The Solution:
Connect the frontend to the real backend database for persistent user storage.

## Step 1: Fix Backend Environment
The backend needs a proper environment file with JWT secret:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and ensure it has:
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=cropguard-super-secret-jwt-key-change-in-production-2024
FRONTEND_URL=http://localhost:5173
DB_PATH=./data/cropguard.db
```

## Step 2: Fix Backend Database Issues
The backend has some database initialization issues. You can either:

### Option A: Quick Fix (Disable problematic services)
Comment out problematic imports in backend routes temporarily:
- `backend/src/routes/agronomist.js` (line 10)
- Any other services causing database errors

### Option B: Full Fix (Recommended)
Fix the agronomist service database initialization error by updating the database methods.

## Step 3: Start Backend Server
```bash
cd backend
npm install  # Install dependencies if needed
npm run dev  # Start in development mode
```

The server should start on http://localhost:3000

## Step 4: Disable Demo Mode
In `frontend/.env`, change:
```env
VITE_DEMO_MODE=false
```

## Step 5: Test Real Registration
1. Restart your frontend development server
2. Register a new user with `testuser@email.com` / `User#1234`
3. The user will now be saved to the SQLite database in `backend/data/cropguard.db`
4. User data will persist across browser restarts and logouts

## Current Status:
- ✅ **Backend exists** with complete SQLite database
- ✅ **Frontend updated** to try backend first, fallback to demo mode
- ✅ **Smart connectivity detection** will automatically use backend when available
- ⏳ **Backend server needs to be started** and database issues resolved

## Console Commands (for testing):
```javascript
// Check current connection status
authService.getConnectionStatus()

// Manually disable demo mode (after backend is running)
authService.setDemoMode(false)

// Restore your lost user account (if needed)
restoreTestUser()
```

## Benefits of Real Backend:
- ✅ **Persistent user accounts** - survive browser data clearing
- ✅ **Multi-device access** - login from different computers
- ✅ **Real database** - proper user management
- ✅ **Scalable** - ready for production deployment
- ✅ **Analysis history** - save plant analyses to database
- ✅ **Admin features** - real user management through admin panel

Once the backend is running, your user registrations will be properly saved to the database and won't disappear on logout!