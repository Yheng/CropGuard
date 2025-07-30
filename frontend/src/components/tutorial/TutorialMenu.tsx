import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  CheckCircle, 
  Clock, 
  User, 
  Settings, 
  RotateCcw, 
  Volume2, 
  VolumeX,
  Globe,
  X
} from 'lucide-react';
import { useTutorial, useTutorialTrigger } from '../../contexts/TutorialContext';
import { TutorialConfig, getTutorialsByRole } from './tutorialConfigs';

interface TutorialMenuProps {
  userRole: 'farmer' | 'agronomist' | 'admin';
  isOpen: boolean;
  onClose: () => void;
}

const TutorialMenu: React.FC<TutorialMenuProps> = ({ userRole, isOpen, onClose }) => {
  const { state, updatePreferences, resetTutorialProgress } = useTutorial();
  const { triggerTutorial, completedTutorials, skippedTutorials } = useTutorialTrigger();
  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const availableTutorials = getTutorialsByRole(userRole);

  const getTutorialStatus = (tutorial: TutorialConfig) => {
    if (completedTutorials.has(tutorial.id)) return 'completed';
    if (skippedTutorials.has(tutorial.id)) return 'skipped';
    return 'available';
  };

  const handleStartTutorial = (tutorialId: string) => {
    triggerTutorial(tutorialId, true); // Force start even if completed
    onClose();
  };

  const handleResetProgress = () => {
    resetTutorialProgress();
    setShowResetConfirm(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'skipped':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Play className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'skipped':
        return 'Skipped';
      default:
        return 'Start';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-50"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Tutorial Center</h2>
              <p className="mt-1 text-sm text-gray-600">
                Learn how to use CropGuard effectively with guided tutorials
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                aria-label="Tutorial settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                aria-label="Close tutorial menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex">
            {/* Main content */}
            <div className="flex-1 p-6">
              {/* Tutorial Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 bg-gray-50 rounded-lg border"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tutorial Settings</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Audio Settings */}
                      <div>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={state.preferences.audioEnabled}
                            onChange={(e) => updatePreferences({ audioEnabled: e.target.checked })}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          <div className="flex items-center space-x-2">
                            {state.preferences.audioEnabled ? (
                              <Volume2 className="w-4 h-4 text-gray-600" />
                            ) : (
                              <VolumeX className="w-4 h-4 text-gray-600" />
                            )}
                            <span className="text-sm font-medium text-gray-700">
                              Enable voice guidance
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Auto-start Settings */}
                      <div>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={state.preferences.autoStart}
                            onChange={(e) => updatePreferences({ autoStart: e.target.checked })}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Auto-start tutorials for new features
                          </span>
                        </label>
                      </div>

                      {/* Language Settings */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Globe className="w-4 h-4 inline mr-1" />
                          Voice Language
                        </label>
                        <select
                          value={state.preferences.language}
                          onChange={(e) => updatePreferences({ language: e.target.value as 'en' | 'es' | 'hi' })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="en">English</option>
                          <option value="es">Español</option>
                          <option value="hi">हिन्दी</option>
                        </select>
                      </div>

                      {/* Playback Speed */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Playback Speed
                        </label>
                        <select
                          value={state.preferences.playbackSpeed}
                          onChange={(e) => updatePreferences({ playbackSpeed: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="0.75">0.75x (Slower)</option>
                          <option value="1.0">1.0x (Normal)</option>
                          <option value="1.25">1.25x (Faster)</option>
                        </select>
                      </div>
                    </div>

                    {/* Reset Progress */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Reset Tutorial Progress</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tutorial List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Available Tutorials</h3>
                
                <div className="grid gap-4">
                  {availableTutorials.map((tutorial) => {
                    const status = getTutorialStatus(tutorial);
                    
                    return (
                      <div
                        key={tutorial.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {getStatusIcon(status)}
                            <h4 className="text-lg font-medium text-gray-900">
                              {tutorial.name}
                            </h4>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <User className="w-3 h-3 mr-1" />
                              {tutorial.targetRole}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {tutorial.description}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{tutorial.estimatedDuration} min</span>
                            </span>
                            <span>{tutorial.steps.length} steps</span>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <button
                            onClick={() => handleStartTutorial(tutorial.id)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                              status === 'completed'
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : status === 'skipped'
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                          >
                            {status === 'completed' ? 'Replay' : getStatusText(status)}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress Summary */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Your Progress</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {completedTutorials.size}
                    </div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {skippedTutorials.size}
                    </div>
                    <div className="text-xs text-gray-600">Skipped</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {availableTutorials.length - completedTutorials.size - skippedTutorials.size}
                    </div>
                    <div className="text-xs text-gray-600">Available</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowResetConfirm(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Reset Tutorial Progress</h3>
              <p className="text-sm text-gray-600 mb-4">
                This will clear all your tutorial progress and mark all tutorials as not started. This action cannot be undone.
              </p>
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetProgress}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Reset Progress
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TutorialMenu;