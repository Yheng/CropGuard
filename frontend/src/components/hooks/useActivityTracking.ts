import { useState, useEffect } from 'react';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  action: string;
  resource: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'error' | 'warning' | 'info';
  category: 'auth' | 'analysis' | 'settings' | 'data' | 'system';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  outcome?: 'success' | 'failure' | 'partial';
  description?: string;
  duration?: number;
  userRole?: 'farmer' | 'agronomist' | 'admin';
  sessionId?: string;
  targetResource?: {
    type: string;
    id: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface ActivityFilter {
  category?: string;
  status?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  searchQuery?: string;
  severity?: string;
  userRole?: string;
  outcome?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export const useActivityTracking = () => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackActivity = (activity: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    const newActivity: ActivityEvent = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    setActivities(prev => [newActivity, ...prev].slice(0, 1000)); // Keep last 1000 activities
  };

  const getActivities = async (filter?: ActivityFilter) => {
    setLoading(true);
    setError(null);

    try {
      // In a real app, this would make an API call
      // For now, return filtered activities from state
      let filtered = activities;

      if (filter?.category) {
        filtered = filtered.filter(a => a.category === filter.category);
      }
      if (filter?.status) {
        filtered = filtered.filter(a => a.status === filter.status);
      }
      if (filter?.userId) {
        filtered = filtered.filter(a => a.userId === filter.userId);
      }
      if (filter?.search) {
        const searchLower = filter.search.toLowerCase();
        filtered = filtered.filter(a => 
          a.action.toLowerCase().includes(searchLower) ||
          a.resource.toLowerCase().includes(searchLower) ||
          a.details?.toLowerCase().includes(searchLower)
        );
      }

      return filtered;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const clearActivities = () => {
    setActivities([]);
  };

  return {
    activities,
    loading,
    error,
    trackActivity,
    getActivities,
    clearActivities
  };
};