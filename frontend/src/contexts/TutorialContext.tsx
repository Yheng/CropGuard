import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type TutorialConfig, tutorialRegistry, getRecommendedTutorial } from '../components/tutorial/tutorialConfigs';

interface TutorialState {
  currentTutorial: TutorialConfig | null;
  isVisible: boolean;
  completedTutorials: Set<string>;
  skippedTutorials: Set<string>;
  preferences: {
    autoStart: boolean;
    audioEnabled: boolean;
    language: 'en' | 'es' | 'hi';
    playbackSpeed: number;
  };
}

interface TutorialContextType {
  state: TutorialState;
  startTutorial: (tutorialId: string) => void;
  completeTutorial: () => void;
  skipTutorial: () => void;
  hideTutorial: () => void;
  showTutorial: () => void;
  updatePreferences: (preferences: Partial<TutorialState['preferences']>) => void;
  shouldShowTutorial: (tutorialId: string) => boolean;
  markTutorialAsCompleted: (tutorialId: string) => void;
  resetTutorialProgress: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

interface TutorialProviderProps {
  children: ReactNode;
  userRole: 'farmer' | 'agronomist' | 'admin';
  userId: string;
  isFirstTimeUser?: boolean;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({
  children,
  userRole,
  userId,
  isFirstTimeUser = false
}) => {
  const [state, setState] = useState<TutorialState>({
    currentTutorial: null,
    isVisible: false,
    completedTutorials: new Set(),
    skippedTutorials: new Set(),
    preferences: {
      autoStart: true,
      audioEnabled: true,
      language: 'en',
      playbackSpeed: 1.0
    }
  });

  const loadTutorialProgress = useCallback(() => {
    try {
      const stored = localStorage.getItem(`cropguard_tutorial_${userId}`);
      if (stored) {
        const data = JSON.parse(stored);
        setState(prev => ({
          ...prev,
          completedTutorials: new Set(data.completedTutorials || []),
          skippedTutorials: new Set(data.skippedTutorials || []),
          preferences: {
            ...prev.preferences,
            ...data.preferences
          }
        }));
      }
    } catch (error) {
      console.warn('Failed to load tutorial progress from localStorage:', error);
    }
  }, [userId]);

  const saveTutorialProgress = useCallback(() => {
    try {
      const data = {
        completedTutorials: Array.from(state.completedTutorials),
        skippedTutorials: Array.from(state.skippedTutorials),
        preferences: state.preferences,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`cropguard_tutorial_${userId}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save tutorial progress to localStorage:', error);
    }
  }, [userId, state.completedTutorials, state.skippedTutorials, state.preferences]);

  const startTutorial = useCallback((tutorialId: string) => {
    const tutorial = tutorialRegistry[tutorialId];
    if (!tutorial) {
      console.warn(`Tutorial not found: ${tutorialId}`);
      return;
    }

    setState(prev => ({
      ...prev,
      currentTutorial: tutorial,
      isVisible: true
    }));

    // Track tutorial start
    trackTutorialEvent('tutorial_started', {
      tutorialId,
      userRole,
      isFirstTime: isFirstTimeUser
    });
  }, [userRole, isFirstTimeUser]);

  const completeTutorial = () => {
    if (!state.currentTutorial) return;

    const tutorialId = state.currentTutorial.id;

    setState(prev => ({
      ...prev,
      completedTutorials: new Set([...prev.completedTutorials, tutorialId]),
      skippedTutorials: new Set([...prev.skippedTutorials].filter(id => id !== tutorialId)),
      currentTutorial: null,
      isVisible: false
    }));

    // Track tutorial completion
    trackTutorialEvent('tutorial_completed', {
      tutorialId,
      userRole,
      completionTime: new Date().toISOString()
    });

    // Show completion message
    showCompletionMessage(tutorialId);
  };

  const skipTutorial = () => {
    if (!state.currentTutorial) return;

    const tutorialId = state.currentTutorial.id;

    setState(prev => ({
      ...prev,
      skippedTutorials: new Set([...prev.skippedTutorials, tutorialId]),
      currentTutorial: null,
      isVisible: false
    }));

    // Track tutorial skip
    trackTutorialEvent('tutorial_skipped', {
      tutorialId,
      userRole,
      skipTime: new Date().toISOString()
    });
  };

  const hideTutorial = () => {
    setState(prev => ({
      ...prev,
      isVisible: false
    }));
  };

  const showTutorial = () => {
    if (state.currentTutorial) {
      setState(prev => ({
        ...prev,
        isVisible: true
      }));
    }
  };

  const updatePreferences = (newPreferences: Partial<TutorialState['preferences']>) => {
    setState(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        ...newPreferences
      }
    }));
  };

  const shouldShowTutorial = (tutorialId: string): boolean => {
    return !state.completedTutorials.has(tutorialId) && !state.skippedTutorials.has(tutorialId);
  };

  const markTutorialAsCompleted = (tutorialId: string) => {
    setState(prev => ({
      ...prev,
      completedTutorials: new Set([...prev.completedTutorials, tutorialId]),
      skippedTutorials: new Set([...prev.skippedTutorials].filter(id => id !== tutorialId))
    }));

    trackTutorialEvent('tutorial_marked_completed', {
      tutorialId,
      userRole
    });
  };

  const resetTutorialProgress = () => {
    setState(prev => ({
      ...prev,
      completedTutorials: new Set(),
      skippedTutorials: new Set(),
      currentTutorial: null,
      isVisible: false
    }));

    // Clear localStorage
    try {
      localStorage.removeItem(`cropguard_tutorial_${userId}`);
    } catch (error) {
      console.warn('Failed to clear tutorial progress from localStorage:', error);
    }

    trackTutorialEvent('tutorial_progress_reset', { userRole });
  };

  const showCompletionMessage = (tutorialId: string) => {
    const tutorial = tutorialRegistry[tutorialId];
    if (!tutorial) return;

    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
    toast.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <span>Tutorial "${tutorial.name}" completed!</span>
      </div>
    `;

    document.body.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  };

  const trackTutorialEvent = (eventName: string, data: Record<string, unknown>) => {
    // Send tutorial events to analytics
    try {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, {
          custom_parameter: JSON.stringify(data)
        });
      }

      // Also log for debugging
      console.log(`Tutorial Event: ${eventName}`, data);
    } catch (error) {
      console.warn('Failed to track tutorial event:', error);
    }
  };

  // Load tutorial progress from localStorage on mount
  useEffect(() => {
    loadTutorialProgress();
  }, [loadTutorialProgress]);

  // Auto-start tutorial for first-time users
  useEffect(() => {
    if (isFirstTimeUser && state.preferences.autoStart) {
      const recommendedTutorial = getRecommendedTutorial(userRole, true);
      if (recommendedTutorial && !state.completedTutorials.has(recommendedTutorial.id)) {
        setTimeout(() => startTutorial(recommendedTutorial.id), 1000);
      }
    }
  }, [isFirstTimeUser, userRole, state.preferences.autoStart, state.completedTutorials, startTutorial]);

  // Save tutorial progress to localStorage whenever state changes
  useEffect(() => {
    saveTutorialProgress();
  }, [saveTutorialProgress]);

  const contextValue: TutorialContextType = {
    state,
    startTutorial,
    completeTutorial,
    skipTutorial,
    hideTutorial,
    showTutorial,
    updatePreferences,
    shouldShowTutorial,
    markTutorialAsCompleted,
    resetTutorialProgress
  };

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
    </TutorialContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTutorial = (): TutorialContextType => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

// Tutorial hook for component-specific guidance
// eslint-disable-next-line react-refresh/only-export-components
export const useTutorialStep = (stepId: string) => {
  const { state } = useTutorial();

  const isCurrentStep = state.currentTutorial?.steps.some(step => step.id === stepId);
  const isActive = state.isVisible && isCurrentStep;

  return {
    isActive,
    isVisible: state.isVisible,
    currentTutorial: state.currentTutorial
  };
};

// Hook for tutorial trigger components
// eslint-disable-next-line react-refresh/only-export-components
export const useTutorialTrigger = () => {
  const { startTutorial, shouldShowTutorial, state } = useTutorial();

  const triggerTutorial = (tutorialId: string, force = false) => {
    if (force || shouldShowTutorial(tutorialId)) {
      startTutorial(tutorialId);
      return true;
    }
    return false;
  };

  return {
    triggerTutorial,
    shouldShowTutorial,
    availableTutorials: Object.values(tutorialRegistry),
    completedTutorials: state.completedTutorials,
    skippedTutorials: state.skippedTutorials
  };
};