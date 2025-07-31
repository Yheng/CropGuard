import { type TutorialStep } from './TutorialSystem';

export interface TutorialConfig {
  id: string;
  name: string;
  description: string;
  targetRole: 'farmer' | 'agronomist' | 'admin' | 'all';
  estimatedDuration: number; // in minutes
  steps: TutorialStep[];
}

// Farmer Onboarding Tutorial
export const farmerOnboardingTutorial: TutorialConfig = {
  id: 'farmer-onboarding',
  name: 'Welcome to CropGuard',
  description: 'Learn how to use CropGuard to protect your crops from pests and diseases',
  targetRole: 'farmer',
  estimatedDuration: 5,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to CropGuard!',
      description: 'CropGuard helps you identify pests and diseases in your crops using AI technology. Let\'s take a quick tour to get you started.',
      audioScript: 'Welcome to CropGuard! This tool will help you identify pests and diseases in your crops using artificial intelligence. Let\'s take a quick tour to get you started.',
      position: 'center',
      nextTrigger: 'manual',
      duration: 5
    },
    {
      id: 'navigation',
      title: 'Navigation Menu',
      description: 'Use this menu to access different features. The main sections are Dashboard, Analysis, Treatments, and Settings.',
      audioScript: 'This is your navigation menu. You can access your dashboard, create new analyses, view treatments, and manage settings from here.',
      targetElement: '[data-tutorial="navigation"]',
      position: 'right',
      action: 'observe',
      nextTrigger: 'manual'
    },
    {
      id: 'upload-button',
      title: 'Upload Your Crop Photos',
      description: 'Click this button to take or upload a photo of your crop. Make sure the photo shows the affected area clearly.',
      audioScript: 'To analyze your crops, click this upload button. You can take a new photo or select one from your device. Make sure the photo clearly shows any problems with your plants.',
      targetElement: '[data-tutorial="upload-button"]',
      position: 'bottom',
      action: 'click',
      nextTrigger: 'validation',
      validationFn: () => document.querySelector('[data-tutorial="file-input"]')?.style.display !== 'none'
    },
    {
      id: 'photo-guidelines',
      title: 'Photo Guidelines',
      description: 'For best results, take photos in good lighting, focus on affected areas, and avoid blurry images. The AI works better with clear, detailed photos.',
      audioScript: 'For the best results, take your photos in good lighting. Focus on the parts of your plants that look sick or damaged. Make sure the photo is not blurry. Clear, detailed photos help our AI give you better advice.',
      position: 'center',
      nextTrigger: 'manual',
      duration: 8
    },
    {
      id: 'crop-type',
      title: 'Select Your Crop Type',
      description: 'Choose the type of crop you\'re analyzing. This helps our AI provide more accurate identification and treatment recommendations.',
      audioScript: 'Select what type of crop you are growing. This helps our artificial intelligence give you more accurate results and better treatment suggestions.',
      targetElement: '[data-tutorial="crop-type-select"]',
      position: 'top',
      action: 'click',
      nextTrigger: 'manual'
    },
    {
      id: 'location',
      title: 'Add Location Information',
      description: 'Adding your location helps us provide region-specific treatment recommendations and weather-related insights.',
      audioScript: 'If you can, add information about where your farm is located. This helps us give you advice that works best in your area and considers your local weather.',
      targetElement: '[data-tutorial="location-input"]',
      position: 'top',
      action: 'input',
      nextTrigger: 'manual'
    },
    {
      id: 'analysis-results',
      title: 'Understanding Your Results',
      description: 'After analysis, you\'ll see the identified problem, confidence level, severity, and recommended treatments. Green means healthy, yellow means minor issues, red means serious problems.',
      audioScript: 'When your analysis is complete, you will see what problem was found, how confident the AI is, how serious the problem is, and what treatments are recommended. Green means your plants are healthy, yellow means small problems, and red means serious problems that need immediate attention.',
      position: 'center',
      nextTrigger: 'manual',
      duration: 10
    },
    {
      id: 'treatments',
      title: 'Treatment Recommendations',
      description: 'View detailed organic treatment options, application instructions, and preventive measures. All treatments are safe for organic farming.',
      audioScript: 'You will get detailed recommendations for organic treatments. These include instructions on how to apply them and ways to prevent problems in the future. All our treatments are safe for organic farming.',
      targetElement: '[data-tutorial="treatments-section"]',
      position: 'top',
      action: 'observe',
      nextTrigger: 'manual'
    },
    {
      id: 'history',
      title: 'Track Your Crop Health',
      description: 'View your analysis history and track how your crop health changes over time. This helps you see patterns and improve your farming practices.',
      audioScript: 'You can see all your past analyses and track how your crop health changes over time. This helps you notice patterns and improve how you take care of your crops.',
      targetElement: '[data-tutorial="history-section"]',
      position: 'left',
      action: 'observe',
      nextTrigger: 'manual'
    },
    {
      id: 'help-support',
      title: 'Getting Help',
      description: 'If you need help, use the help button or contact support. You can also replay this tutorial anytime from the settings menu.',
      audioScript: 'If you need help at any time, click the help button or contact our support team. You can also watch this tutorial again from the settings menu.',
      targetElement: '[data-tutorial="help-button"]',
      position: 'left',
      action: 'observe',
      nextTrigger: 'manual'
    },
    {
      id: 'completion',
      title: 'You\'re Ready to Start!',
      description: 'Congratulations! You\'re now ready to use CropGuard to protect your crops. Start by uploading your first crop photo.',
      audioScript: 'Congratulations! You are now ready to use CropGuard to protect your crops. Start by taking a photo of your plants and let our AI help you keep them healthy.',
      position: 'center',
      nextTrigger: 'manual'
    }
  ]
};

// Agronomist Workflow Tutorial
export const agronomistWorkflowTutorial: TutorialConfig = {
  id: 'agronomist-workflow',
  name: 'Agronomist Review System',
  description: 'Learn how to review and validate AI analyses as an agronomist',
  targetRole: 'agronomist',
  estimatedDuration: 8,
  steps: [
    {
      id: 'agronomist-welcome',
      title: 'Welcome, Agricultural Expert',
      description: 'As an agronomist, you play a crucial role in validating AI analyses and helping farmers with expert guidance.',
      audioScript: 'Welcome to the CropGuard agronomist interface. Your expertise is vital in validating our AI analyses and providing farmers with the best possible guidance.',
      position: 'center',
      nextTrigger: 'manual'
    },
    {
      id: 'review-queue',
      title: 'Analysis Review Queue',
      description: 'This is your review queue. Analyses are prioritized by urgency and farmer requests. You can see pending reviews here.',
      audioScript: 'This is your analysis review queue. Here you can see all the analyses waiting for your expert review, organized by priority and urgency.',
      targetElement: '[data-tutorial="review-queue"]',
      position: 'right',
      action: 'observe',
      nextTrigger: 'manual'
    },
    {
      id: 'analysis-details',
      title: 'Review Analysis Details',
      description: 'Click on an analysis to see the original image, AI diagnosis, confidence levels, and farmer-provided context.',
      audioScript: 'Click on any analysis to see the full details including the original image, AI diagnosis, confidence levels, and any additional information provided by the farmer.',
      targetElement: '[data-tutorial="analysis-item"]',
      position: 'right',
      action: 'click',
      nextTrigger: 'manual'
    },
    {
      id: 'validation-tools',
      title: 'Validation Tools',
      description: 'Use these tools to approve, modify, or reject the AI analysis. You can add your own diagnosis and treatment recommendations.',
      audioScript: 'Use these validation tools to approve the AI analysis if it\'s correct, modify it if needed, or provide your own expert diagnosis and treatment recommendations.',
      targetElement: '[data-tutorial="validation-tools"]',
      position: 'left',
      action: 'observe',
      nextTrigger: 'manual'
    },
    {
      id: 'expert-comments',
      title: 'Add Expert Comments',
      description: 'Provide detailed comments and additional guidance for farmers. Your expertise helps them make better decisions.',
      audioScript: 'Add your expert comments and additional guidance for farmers. Your professional insights help them understand the problem better and make informed decisions.',
      targetElement: '[data-tutorial="expert-comments"]',
      position: 'top',
      action: 'input',
      nextTrigger: 'manual'
    },
    {
      id: 'treatment-override',
      title: 'Override Treatment Recommendations',
      description: 'If needed, you can modify or replace the AI-suggested treatments with your own professional recommendations.',
      audioScript: 'When necessary, you can modify or completely replace the AI treatment suggestions with your own professional recommendations based on your expertise.',
      targetElement: '[data-tutorial="treatment-override"]',
      position: 'top',
      action: 'observe',
      nextTrigger: 'manual'
    },
    {
      id: 'bulk-actions',
      title: 'Bulk Review Actions',
      description: 'For efficiency, you can select multiple analyses and perform bulk actions like approval or assignment to other agronomists.',
      audioScript: 'To save time, you can select multiple analyses and perform bulk actions such as approving several similar cases or assigning them to other agronomists.',
      targetElement: '[data-tutorial="bulk-actions"]',
      position: 'bottom',
      action: 'observe',
      nextTrigger: 'manual'
    },
    {
      id: 'feedback-system',
      title: 'Provide Feedback to AI',
      description: 'Your corrections help improve the AI system. Mark whether the AI diagnosis was accurate to help train the model.',
      audioScript: 'Your feedback is crucial for improving our AI system. Please indicate whether the AI diagnosis was accurate, as this helps train the model to become more reliable.',
      targetElement: '[data-tutorial="ai-feedback"]',
      position: 'right',
      action: 'observe',
      nextTrigger: 'manual'
    }
  ]
};

// Quick Photo Analysis Tutorial
export const quickAnalysisTutorial: TutorialConfig = {
  id: 'quick-analysis',
  name: 'Quick Photo Analysis',
  description: 'Learn how to quickly analyze a crop photo',
  targetRole: 'farmer',
  estimatedDuration: 2,
  steps: [
    {
      id: 'quick-upload',
      title: 'Upload Your Photo',
      description: 'Click here to upload or take a photo of your crop',
      audioScript: 'Click this button to upload a photo of your crop or take a new one with your camera',
      targetElement: '[data-tutorial="upload-button"]',
      position: 'bottom',
      action: 'click',
      nextTrigger: 'validation',
      validationFn: () => !!document.querySelector('[data-tutorial="uploaded-image"]')
    },
    {
      id: 'quick-select-crop',
      title: 'Select Crop Type',
      description: 'Choose your crop type for more accurate results',
      audioScript: 'Select what type of crop this is to get more accurate analysis results',
      targetElement: '[data-tutorial="crop-type-select"]',
      position: 'top',
      action: 'click',
      nextTrigger: 'validation',
      validationFn: () => !!document.querySelector('[data-tutorial="crop-type-select"]')?.value
    },
    {
      id: 'quick-analyze',
      title: 'Start Analysis',
      description: 'Click analyze to get AI-powered results',
      audioScript: 'Click the analyze button to start the AI analysis of your crop photo',
      targetElement: '[data-tutorial="analyze-button"]',
      position: 'top',
      action: 'click',
      nextTrigger: 'validation',
      validationFn: () => !!document.querySelector('[data-tutorial="analysis-results"]')
    },
    {
      id: 'quick-results',
      title: 'View Results',
      description: 'Here are your analysis results with recommended treatments',
      audioScript: 'Here are your results showing what was detected and recommended treatments for your crop',
      targetElement: '[data-tutorial="analysis-results"]',
      position: 'top',
      action: 'observe',
      nextTrigger: 'manual'
    }
  ]
};

// Settings and Profile Tutorial
export const settingsTutorial: TutorialConfig = {
  id: 'settings-profile',
  name: 'Settings and Profile',
  description: 'Customize your CropGuard experience',
  targetRole: 'all',
  estimatedDuration: 3,
  steps: [
    {
      id: 'profile-access',
      title: 'Access Your Profile',
      description: 'Click here to access your profile and account settings',
      audioScript: 'Click on your profile to access account settings and preferences',
      targetElement: '[data-tutorial="profile-menu"]',
      position: 'bottom',
      action: 'click',
      nextTrigger: 'manual'
    },
    {
      id: 'farm-info',
      title: 'Farm Information',
      description: 'Add your farm details for personalized recommendations',
      audioScript: 'Add information about your farm location, size, and crops for more personalized recommendations',
      targetElement: '[data-tutorial="farm-info"]',
      position: 'right',
      action: 'observe',
      nextTrigger: 'manual'
    },
    {
      id: 'notification-settings',
      title: 'Notification Preferences',
      description: 'Choose how you want to be notified about analysis results and updates',
      audioScript: 'Set up your notification preferences to stay informed about analysis results and important updates',
      targetElement: '[data-tutorial="notifications"]',
      position: 'left',
      action: 'observe',
      nextTrigger: 'manual'
    },
    {
      id: 'language-settings',
      title: 'Language Settings',
      description: 'Change the app language and voice guidance preferences',
      audioScript: 'You can change the app language and adjust voice guidance settings to match your preferences',
      targetElement: '[data-tutorial="language-settings"]',
      position: 'top',
      action: 'observe',
      nextTrigger: 'manual'
    }
  ]
};

// Tutorial registry for easy access
export const tutorialRegistry: Record<string, TutorialConfig> = {
  'farmer-onboarding': farmerOnboardingTutorial,
  'agronomist-workflow': agronomistWorkflowTutorial,
  'quick-analysis': quickAnalysisTutorial,
  'settings-profile': settingsTutorial
};

// Helper function to get tutorials by role
export function getTutorialsByRole(role: 'farmer' | 'agronomist' | 'admin'): TutorialConfig[] {
  return Object.values(tutorialRegistry).filter(
    tutorial => tutorial.targetRole === role || tutorial.targetRole === 'all'
  );
}

// Helper function to get recommended first tutorial for a user
export function getRecommendedTutorial(role: 'farmer' | 'agronomist' | 'admin', isFirstTime: boolean): TutorialConfig | null {
  if (isFirstTime) {
    switch (role) {
      case 'farmer':
        return farmerOnboardingTutorial;
      case 'agronomist':
        return agronomistWorkflowTutorial;
      case 'admin':
        return settingsTutorial;
      default:
        return farmerOnboardingTutorial;
    }
  }
  return null;
}