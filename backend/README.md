# CropGuard Backend

Node.js/Express backend API for the CropGuard application.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Configure environment variables in `.env`

4. Start development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Express middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── config/         # Configuration files
├── tests/              # Test files
└── docs/              # API documentation
```

## API Endpoints

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/upload` - Image upload
- `GET /api/analyses/:id` - Get analysis results
- `GET /api/crop-health` - Get crop health data

## Development

- `npm run dev` - Start development server with hot reload
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier