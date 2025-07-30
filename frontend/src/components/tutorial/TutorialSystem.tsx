import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Volume2, VolumeX, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  audioScript: string;
  targetElement?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'input' | 'wait' | 'observe';
  validationFn?: () => boolean;
  nextTrigger?: 'manual' | 'auto' | 'validation';
  duration?: number; // Auto-advance duration in seconds
}

interface TutorialSystemProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
  isVisible: boolean;
  language?: 'en' | 'es' | 'hi';
}

const TutorialSystem: React.FC<TutorialSystemProps> = ({
  steps,
  onComplete,
  onSkip,
  isVisible,
  language = 'en'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Text-to-speech configuration for different languages
  const speechConfig = {
    en: { lang: 'en-US', rate: 0.9, pitch: 1.0 },
    es: { lang: 'es-ES', rate: 0.9, pitch: 1.0 },
    hi: { lang: 'hi-IN', rate: 0.8, pitch: 1.0 }
  };

  // Initialize tutorial when visible
  useEffect(() => {
    if (isVisible && step) {
      setProgress((currentStep / steps.length) * 100);
      
      // Highlight target element if specified
      if (step.targetElement) {
        highlightElement(step.targetElement);
      }

      // Auto-play audio/video guidance
      setTimeout(() => {
        playGuidance();
      }, 500);
    }

    return () => {
      // Cleanup highlighting
      clearHighlights();
      stopSpeech();
    };
  }, [currentStep, isVisible, step]);

  // Auto-advance for timed steps
  useEffect(() => {
    if (step?.nextTrigger === 'auto' && step.duration) {
      const timer = setTimeout(() => {
        nextStep();
      }, step.duration * 1000);

      return () => clearTimeout(timer);
    }
  }, [currentStep, step]);

  // Validation-based advancement
  useEffect(() => {
    if (step?.nextTrigger === 'validation' && step.validationFn) {
      const checkValidation = () => {
        if (step.validationFn!()) {
          markStepCompleted();
          setTimeout(nextStep, 1000); // Small delay to show completion
        }
      };

      const interval = setInterval(checkValidation, 1000);
      return () => clearInterval(interval);
    }
  }, [currentStep, step]);

  const playGuidance = async () => {
    if (!step) return;

    try {
      // Stop any current speech
      stopSpeech();

      // Play video if available
      if (step.videoUrl && videoRef.current) {
        videoRef.current.src = step.videoUrl;
        videoRef.current.play();
        setIsPlaying(true);
      }

      // Use text-to-speech for audio guidance
      if (step.audioScript && !isMuted && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(step.audioScript);
        const config = speechConfig[language];
        
        utterance.lang = config.lang;
        utterance.rate = config.rate;
        utterance.pitch = config.pitch;
        utterance.volume = 0.8;

        utterance.onend = () => {
          setIsPlaying(false);
        };

        utterance.onerror = () => {
          setIsPlaying(false);
          console.warn('Text-to-speech failed, falling back to text only');
        };

        speechSynthesisRef.current = utterance;
        speechSynthesis.speak(utterance);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Failed to play guidance:', error);
      setIsPlaying(false);
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopSpeech();
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      playGuidance();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      stopSpeech();
    }
  };

  const highlightElement = (selector: string) => {
    try {
      const element = document.querySelector(selector);
      if (element) {
        element.classList.add('tutorial-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (error) {
      console.warn('Failed to highlight element:', selector, error);
    }
  };

  const clearHighlights = () => {
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
  };

  const markStepCompleted = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
  };

  const nextStep = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipTutorial = () => {
    setShowSkipConfirmation(true);
  };

  const confirmSkip = () => {
    onSkip();
    setShowSkipConfirmation(false);
  };

  const getTooltipPosition = () => {
    if (!step?.targetElement) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    try {
      const element = document.querySelector(step.targetElement);
      if (!element) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

      const rect = element.getBoundingClientRect();
      const { position } = step;

      switch (position) {
        case 'top':
          return {
            top: rect.top - 20,
            left: rect.left + rect.width / 2,
            transform: 'translate(-50%, -100%)'
          };
        case 'bottom':
          return {
            top: rect.bottom + 20,
            left: rect.left + rect.width / 2,
            transform: 'translate(-50%, 0)'
          };
        case 'left':
          return {
            top: rect.top + rect.height / 2,
            left: rect.left - 20,
            transform: 'translate(-100%, -50%)'
          };
        case 'right':
          return {
            top: rect.top + rect.height / 2,
            left: rect.right + 20,
            transform: 'translate(0, -50%)'
          };
        default:
          return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      }
    } catch (error) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  if (!isVisible || !step) return null;

  return (
    <>
      {/* Tutorial Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 tutorial-overlay">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
          <motion.div
            className="h-full bg-green-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Tutorial Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            className="absolute bg-white rounded-lg shadow-xl max-w-md w-full mx-4 tutorial-tooltip"
            style={getTooltipPosition()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-medium text-gray-600">
                    Step {currentStep + 1} of {steps.length}
                  </span>
                  {completedSteps.has(currentStep) && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Audio Controls */}
                <button
                  onClick={togglePlayback}
                  className="p-1 rounded-full hover:bg-gray-100"
                  aria-label={isPlaying ? 'Pause guidance' : 'Play guidance'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Play className="w-4 h-4 text-gray-600" />
                  )}
                </button>
                
                <button
                  onClick={toggleMute}
                  className="p-1 rounded-full hover:bg-gray-100"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-gray-600" />
                  )}
                </button>

                <button
                  onClick={skipTutorial}
                  className="p-1 rounded-full hover:bg-gray-100"
                  aria-label="Skip tutorial"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {step.title}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {step.description}
              </p>

              {/* Video Player */}
              {step.videoUrl && (
                <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
                  <video
                    ref={videoRef}
                    className="w-full h-32 object-cover"
                    controls={false}
                    muted={isMuted}
                    onEnded={() => setIsPlaying(false)}
                  />
                </div>
              )}

              {/* Action Indicator */}
              {step.action && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-sm text-blue-700">
                      {step.action === 'click' && 'Click the highlighted element'}
                      {step.action === 'input' && 'Enter information in the highlighted field'}
                      {step.action === 'wait' && 'Please wait while we process...'}
                      {step.action === 'observe' && 'Observe the highlighted area'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <button
                onClick={previousStep}
                disabled={currentStep === 0}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex space-x-1">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentStep
                        ? 'bg-green-500'
                        : completedSteps.has(index)
                        ? 'bg-green-300'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={nextStep}
                disabled={step.nextTrigger === 'validation' && !completedSteps.has(currentStep)}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isLastStep ? 'Complete' : 'Next'}</span>
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Skip Confirmation Modal */}
        <AnimatePresence>
          {showSkipConfirmation && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Skip Tutorial?
                </h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to skip the tutorial? You can always access it later from the help menu.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowSkipConfirmation(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Continue Tutorial
                  </button>
                  <button
                    onClick={confirmSkip}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tutorial Styles */}
      <style jsx global>{`
        .tutorial-highlight {
          position: relative;
          z-index: 51;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.5), 0 0 0 8px rgba(34, 197, 94, 0.2);
          border-radius: 4px;
          animation: tutorial-pulse 2s infinite;
        }

        @keyframes tutorial-pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.5), 0 0 0 8px rgba(34, 197, 94, 0.2);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.8), 0 0 0 8px rgba(34, 197, 94, 0.4);
          }
        }

        .tutorial-tooltip {
          max-height: 80vh;
          overflow-y: auto;
        }

        @media (max-width: 640px) {
          .tutorial-tooltip {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: calc(100vw - 2rem);
            max-width: none;
          }
        }
      `}</style>

      {/* Audio element for custom audio files */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </>
  );
};

export default TutorialSystem;