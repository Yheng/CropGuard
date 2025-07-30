import React from 'react';
import TutorialSystem from './TutorialSystem';
import { useTutorial } from '../../contexts/TutorialContext';

interface TutorialIntegrationProps {
  language?: 'en' | 'es' | 'hi';
}

/**
 * Integration component that connects the tutorial system with the global tutorial context
 */
const TutorialIntegration: React.FC<TutorialIntegrationProps> = ({ 
  language = 'en' 
}) => {
  const { state, completeTutorial, skipTutorial } = useTutorial();

  if (!state.currentTutorial) {
    return null;
  }

  return (
    <TutorialSystem
      steps={state.currentTutorial.steps}
      onComplete={completeTutorial}
      onSkip={skipTutorial}
      isVisible={state.isVisible}
      language={state.preferences.language || language}
    />
  );
};

export default TutorialIntegration;