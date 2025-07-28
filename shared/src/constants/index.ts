// Shared constants for CropGuard application

export const USER_ROLES = {
  FARMER: 'farmer' as const,
  AGRONOMIST: 'agronomist' as const,
  ADMIN: 'admin' as const,
};

export const IMAGE_STATUS = {
  PENDING: 'pending' as const,
  PROCESSING: 'processing' as const,
  ANALYZED: 'analyzed' as const,
  ERROR: 'error' as const,
  SYNCED: 'synced' as const,
};

export const TREATMENT_CATEGORIES = {
  BIOLOGICAL: 'biological' as const,
  CULTURAL: 'cultural' as const,
  MECHANICAL: 'mechanical' as const,
  ORGANIC_CHEMICAL: 'organic-chemical' as const,
};

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
  },
  
  // User management
  USERS: {
    PROFILE: '/api/users/profile',
    UPDATE: '/api/users/profile',
    LIST: '/api/users',
    DELETE: (id: string) => `/api/users/${id}`,
  },
  
  // Image upload and analysis
  IMAGES: {
    UPLOAD: '/api/images/upload',
    LIST: '/api/images',
    GET: (id: string) => `/api/images/${id}`,
    DELETE: (id: string) => `/api/images/${id}`,
  },
  
  // Analysis
  ANALYSES: {
    LIST: '/api/analyses',
    GET: (id: string) => `/api/analyses/${id}`,
    PENDING: '/api/analyses/pending',
    UPDATE: (id: string) => `/api/analyses/${id}`,
    BULK: '/api/analyses/bulk',
  },
  
  // Crop health
  CROP_HEALTH: {
    DATA: '/api/crop-health',
    TRENDS: '/api/crop-health/trends',
  },
  
  // Admin
  ADMIN: {
    CONFIG: '/api/admin/config',
    LOGS: '/api/admin/logs',
    STATS: '/api/admin/stats',
  },
};

export const VALIDATION_RULES = {
  IMAGE: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
    MIN_DIMENSIONS: { width: 224, height: 224 },
    MAX_DIMENSIONS: { width: 4096, height: 4096 },
  },
  
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: false,
  },
  
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
};

export const UI_CONSTANTS = {
  COLORS: {
    PRIMARY: '#1F2A44',
    ACCENT_GREEN: '#10B981',
    ACCENT_TEAL: '#2DD4BF',
    ALERT_ORANGE: '#F59E0B',
  },
  
  ANIMATION: {
    DURATION: 300,
    EASING: 'ease-in-out',
  },
  
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
  },
};

export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FILE_TOO_LARGE: 'File size must be less than 5MB.',
  INVALID_FILE_TYPE: 'Please select a JPEG or PNG image file.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  WEAK_PASSWORD: 'Password must be at least 8 characters long.',
};

export const SUCCESS_MESSAGES = {
  UPLOAD_SUCCESS: 'Image uploaded successfully!',
  ANALYSIS_COMPLETE: 'Analysis completed successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  LOGIN_SUCCESS: 'Welcome back!',
  SIGNUP_SUCCESS: 'Account created successfully!',
};