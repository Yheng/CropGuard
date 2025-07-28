// Core types and interfaces
export interface User {
  id: string;
  email: string;
  role: 'farmer' | 'agronomist' | 'admin';
  createdAt: string;
}

export interface CropImage {
  id: string;
  userId: string;
  filePath: string;
  uploadedAt: string;
  status: 'pending' | 'synced' | 'processing';
}

export interface Analysis {
  id: string;
  imageId: string;
  pestDisease: string;
  severity: number; // 1-10
  confidence: number; // 0-1
  treatment: string;
  agronomistComments?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface Treatment {
  id: string;
  analysisId: string;
  description: string;
  region: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code: number;
  details?: any;
}

// Chart data types
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
}

export interface CropHealthData {
  crop: string;
  date: string;
  severity: number;
  pestCount: number;
}