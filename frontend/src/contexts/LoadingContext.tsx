import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { LoadingOverlay, NavigationLoader } from '../components/ui/LoadingSpinner'
import { AnimatePresence } from 'framer-motion'

interface LoadingState {
  isNavigating: boolean
  isLoading: boolean
  message: string
  variant: 'plant-growth' | 'leaf-spin' | 'farm-ecosystem' | 'simple'
}

interface LoadingContextType {
  // State
  loadingState: LoadingState
  
  // Navigation loading
  startNavigation: (message?: string) => void
  endNavigation: () => void
  
  // General loading
  startLoading: (message?: string, variant?: LoadingState['variant']) => void
  endLoading: () => void
  
  // Utility functions
  withLoading: <T extends unknown[]>(
    fn: (...args: T) => Promise<unknown>, 
    message?: string
  ) => (...args: T) => Promise<unknown>
  
  withNavigation: <T extends unknown[]>(
    fn: (...args: T) => Promise<unknown>, 
    message?: string
  ) => (...args: T) => Promise<unknown>
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}

interface LoadingProviderProps {
  children: ReactNode
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isNavigating: false,
    isLoading: false,
    message: '',
    variant: 'farm-ecosystem'
  })

  const startNavigation = useCallback((message = 'Navigating...') => {
    setLoadingState(prev => ({
      ...prev,
      isNavigating: true,
      message
    }))
  }, [])

  const endNavigation = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      isNavigating: false
    }))
  }, [])

  const startLoading = useCallback((
    message = 'Loading...', 
    variant: LoadingState['variant'] = 'farm-ecosystem'
  ) => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: true,
      message,
      variant
    }))
  }, [])

  const endLoading = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false
    }))
  }, [])

  const withLoading = useCallback(<T extends unknown[]>(
    fn: (...args: T) => Promise<unknown>,
    message = 'Processing...'
  ) => {
    return async (...args: T) => {
      try {
        startLoading(message)
        const result = await fn(...args)
        return result
      } finally {
        endLoading()
      }
    }
  }, [startLoading, endLoading])

  const withNavigation = useCallback(<T extends unknown[]>(
    fn: (...args: T) => Promise<unknown>,
    message = 'Navigating...'
  ) => {
    return async (...args: T) => {
      try {
        startNavigation(message)
        const result = await fn(...args)
        // Add a small delay to show the navigation indicator
        await new Promise(resolve => setTimeout(resolve, 500))
        return result
      } finally {
        endNavigation()
      }
    }
  }, [startNavigation, endNavigation])

  const contextValue: LoadingContextType = {
    loadingState,
    startNavigation,
    endNavigation,
    startLoading,
    endLoading,
    withLoading,
    withNavigation
  }

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      
      {/* Loading Overlays */}
      <AnimatePresence>
        {loadingState.isLoading && (
          <LoadingOverlay 
            message={loadingState.message}
            variant={loadingState.variant}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {loadingState.isNavigating && (
          <NavigationLoader 
            message={loadingState.message}
          />
        )}
      </AnimatePresence>
    </LoadingContext.Provider>
  )
}

// Helper hook for common loading patterns
// eslint-disable-next-line react-refresh/only-export-components
export function useAsyncAction() {
  const { withLoading, withNavigation } = useLoading()
  
  return {
    // For API calls and data processing
    executeWithLoading: withLoading,
    
    // For navigation actions
    executeWithNavigation: withNavigation,
    
    // For quick actions (login, logout, etc.)
    async executeQuick<T>(
      fn: () => Promise<T>, 
      message = 'Processing...'
    ): Promise<T> {
      return withLoading(fn, message)()
    }
  }
}