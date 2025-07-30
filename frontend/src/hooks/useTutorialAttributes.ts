import { useMemo } from 'react';
import { useTutorialStep } from '../contexts/TutorialContext';

/**
 * Hook for adding tutorial data attributes to components
 * Makes it easy to mark elements for tutorial targeting
 */
export function useTutorialAttributes(tutorialId: string, options?: {
  className?: string;
  highlightOnActive?: boolean;
}) {
  const { isActive } = useTutorialStep(tutorialId);
  
  return useMemo(() => {
    const attributes: Record<string, any> = {
      'data-tutorial': tutorialId
    };

    // Add highlight class when tutorial is active
    if (options?.highlightOnActive && isActive) {
      attributes.className = [
        options.className || '',
        'tutorial-target-active'
      ].filter(Boolean).join(' ');
    }

    return attributes;
  }, [tutorialId, isActive, options?.className, options?.highlightOnActive]);
}

/**
 * Helper function to create tutorial attributes without using hooks
 * Useful for static components or when you don't need reactivity
 */
export function createTutorialAttributes(tutorialId: string, className?: string) {
  return {
    'data-tutorial': tutorialId,
    ...(className && { className })
  };
}

/**
 * Tutorial step completion helper
 */
export function useTutorialCompletion(stepId: string, completionCondition: () => boolean) {
  const { isActive } = useTutorialStep(stepId);
  
  // Check completion condition when step is active
  if (isActive && completionCondition()) {
    // The tutorial system will handle the actual step completion
    // through its validation mechanism
    return true;
  }
  
  return false;
}