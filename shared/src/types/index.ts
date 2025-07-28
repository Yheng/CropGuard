// Shared types for CropGuard application

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export type UserRole = 'farmer' | 'agronomist' | 'admin';

export interface CropImage {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  status: ImageStatus;
}

export type ImageStatus = 'pending' | 'processing' | 'analyzed' | 'error' | 'synced';

export interface Analysis {
  id: string;
  imageId: string;
  pestDisease: string;
  severity: number; // 1-10 scale
  confidence: number; // 0-1 scale
  treatment: string;
  region?: string;
  aiModel: string;
  agronomistComments?: string;
  agronomistId?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Treatment {
  id: string;
  name: string;
  description: string;
  category: TreatmentCategory;
  organicCompliant: boolean;
  instructions: string;
  precautions?: string;
  region?: string;
}

export type TreatmentCategory = 'biological' | 'cultural' | 'mechanical' | 'organic-chemical';

export interface CropHealthData {
  id: string;
  userId: string;
  crop: string;
  date: string;
  severity: number;
  pestCount: number;
  diseaseCount: number;
  region?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
}

// Upload types
export interface UploadRequest {
  file: File;
  cropType?: string;
  location?: string;
}

export interface UploadResponse {
  imageId: string;
  filename: string;
  status: ImageStatus;
}

// Chart data types
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

// Configuration types
export interface AppConfig {
  apiBaseUrl: string;
  uploadMaxSize: number;
  supportedImageTypes: string[];
  rateLimits: {
    uploads: number;
    analyses: number;
  };
}