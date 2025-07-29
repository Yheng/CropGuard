// import axios from 'axios' // TODO: Use when backend is ready

export interface Treatment {
  id: string
  name: string
  type: 'organic' | 'biological' | 'cultural' | 'preventive'
  description: string
  ingredients: string[]
  instructions: string[]
  effectiveness: number // 0-1 scale
  applicationMethod: string
  frequency: string
  safetyPeriod: string // days before harvest
  cost: 'low' | 'medium' | 'high'
  difficulty: 'easy' | 'moderate' | 'advanced'
  seasonalNotes?: string
  warnings?: string[]
}

export interface TreatmentPlan {
  id: string
  analysisId: string
  condition: string
  severity: 'low' | 'medium' | 'high'
  urgency: 'immediate' | 'within_week' | 'monitor'
  primaryTreatments: Treatment[]
  alternativeTreatments: Treatment[]
  preventiveMeasures: Treatment[]
  monitoringSchedule: {
    frequency: string
    duration: string
    checkpoints: string[]
  }
  estimatedRecoveryTime: string
  totalCost: string
}

// Mock treatment database
const mockTreatments: Record<string, Treatment[]> = {
  'early_blight': [
    {
      id: 'copper_spray_eb',
      name: 'Copper-Based Fungicide Spray',
      type: 'organic',
      description: 'Organic copper fungicide effective against early blight. Prevents spore germination and spread.',
      ingredients: ['Copper sulfate', 'Lime', 'Water'],
      instructions: [
        'Mix 2 tablespoons copper sulfate with 1 gallon water',
        'Add 1 tablespoon lime to reduce plant burn risk',
        'Spray thoroughly on affected and surrounding plants',
        'Apply in early morning or evening to avoid leaf burn',
        'Ensure complete coverage of leaf surfaces'
      ],
      effectiveness: 0.85,
      applicationMethod: 'Foliar spray',
      frequency: 'Every 7-10 days',
      safetyPeriod: '1 day',
      cost: 'low',
      difficulty: 'easy',
      seasonalNotes: 'Most effective in warm, humid conditions',
      warnings: ['Avoid application during full sun', 'Wear protective equipment']
    },
    {
      id: 'baking_soda_eb',
      name: 'Baking Soda Solution',
      type: 'organic',
      description: 'Natural antifungal treatment that changes leaf surface pH to inhibit fungal growth.',
      ingredients: ['Baking soda', 'Liquid soap', 'Water'],
      instructions: [
        'Mix 1 teaspoon baking soda per quart of water',
        'Add 2-3 drops liquid soap as surfactant',
        'Spray on affected leaves and stems',
        'Apply weekly as preventive measure',
        'Test on small area first to check plant tolerance'
      ],
      effectiveness: 0.65,
      applicationMethod: 'Foliar spray',
      frequency: 'Weekly',
      safetyPeriod: '0 days',
      cost: 'low',
      difficulty: 'easy',
      warnings: ['May cause leaf burn on sensitive plants']
    }
  ],
  'aphids': [
    {
      id: 'insecticidal_soap',
      name: 'Insecticidal Soap Spray',
      type: 'organic',
      description: 'Kills aphids on contact by disrupting cell membranes. Safe for beneficial insects when dry.',
      ingredients: ['Liquid castile soap', 'Water'],
      instructions: [
        'Mix 2 tablespoons liquid soap per quart of water',
        'Spray directly on aphid colonies',
        'Target undersides of leaves where aphids congregate',
        'Apply every 3-4 days until infestation clears',
        'Rinse plants with water 2-3 hours after application'
      ],
      effectiveness: 0.80,
      applicationMethod: 'Direct spray',
      frequency: 'Every 3-4 days',
      safetyPeriod: '0 days',
      cost: 'low',
      difficulty: 'easy'
    },
    {
      id: 'neem_oil_aphids',
      name: 'Neem Oil Treatment',
      type: 'organic',
      description: 'Natural insecticide that disrupts aphid feeding and reproduction cycles.',
      ingredients: ['Cold-pressed neem oil', 'Liquid soap', 'Water'],
      instructions: [
        'Mix 2 teaspoons neem oil with 1 teaspoon liquid soap',
        'Add to 1 quart warm water and mix thoroughly',
        'Spray in early morning or evening',
        'Cover all plant surfaces including undersides',
        'Reapply after rain or heavy dew'
      ],
      effectiveness: 0.75,
      applicationMethod: 'Foliar spray',
      frequency: 'Every 7 days',
      safetyPeriod: '0 days',
      cost: 'medium',
      difficulty: 'easy',
      warnings: ['Avoid application during bloom to protect pollinators']
    },
    {
      id: 'beneficial_insects',
      name: 'Beneficial Insect Release',
      type: 'biological',
      description: 'Introduce natural predators like ladybugs and lacewings to control aphid populations.',
      ingredients: ['Ladybugs', 'Lacewing larvae', 'Parasitic wasps'],
      instructions: [
        'Release beneficial insects in early evening',
        'Ensure adequate moisture and shelter',
        'Release near aphid colonies for immediate impact',
        'Provide alternative food sources (pollen plants)',
        'Avoid pesticides for 2 weeks before and after release'
      ],
      effectiveness: 0.90,
      applicationMethod: 'Biological release',
      frequency: 'One-time release, monitor results',
      safetyPeriod: '0 days',
      cost: 'medium',
      difficulty: 'moderate',
      seasonalNotes: 'Most effective in temperatures 65-80°F'
    }
  ],
  'powdery_mildew': [
    {
      id: 'sulfur_fungicide',
      name: 'Organic Sulfur Fungicide',
      type: 'organic',
      description: 'Sulfur-based treatment that prevents and treats powdery mildew infections.',
      ingredients: ['Elemental sulfur', 'Wetting agent'],
      instructions: [
        'Apply sulfur dust or spray according to package directions',
        'Ensure thorough coverage of all plant surfaces',
        'Apply early morning when dew is present',
        'Repeat every 7-14 days during infection period',
        'Stop applications 2 weeks before harvest'
      ],
      effectiveness: 0.88,
      applicationMethod: 'Dust or spray',
      frequency: 'Every 7-14 days',
      safetyPeriod: '14 days',
      cost: 'low',
      difficulty: 'easy',
      warnings: ['Do not apply when temperatures exceed 85°F']
    }
  ]
}

const mockPreventiveTreatments: Treatment[] = [
  {
    id: 'crop_rotation',
    name: 'Crop Rotation',
    type: 'cultural',
    description: 'Rotate crop families to break disease and pest cycles in soil.',
    ingredients: ['Different crop varieties'],
    instructions: [
      'Plan 3-4 year rotation cycle',
      'Avoid planting same family crops in succession',
      'Include nitrogen-fixing legumes in rotation',
      'Keep detailed planting records',
      'Consider soil health between rotations'
    ],
    effectiveness: 0.75,
    applicationMethod: 'Cultural practice',
    frequency: 'Annual planning',
    safetyPeriod: '0 days',
    cost: 'low',
    difficulty: 'moderate'
  },
  {
    id: 'proper_spacing',
    name: 'Proper Plant Spacing',
    type: 'cultural',
    description: 'Maintain adequate space between plants to improve air circulation and reduce disease pressure.',
    ingredients: ['Planning and measurement tools'],
    instructions: [
      'Follow recommended spacing for each crop variety',
      'Ensure 6-12 inches between most vegetable plants',
      'Prune lower branches to improve airflow',
      'Remove weeds that compete for space',
      'Consider vertical growing for space-limited areas'
    ],
    effectiveness: 0.70,
    applicationMethod: 'Cultural practice',
    frequency: 'At planting and throughout season',
    safetyPeriod: '0 days',
    cost: 'low',
    difficulty: 'easy'
  }
]

export const treatmentService = {
  getTreatmentPlan: async (analysisId: string, condition: string, severity: 'low' | 'medium' | 'high'): Promise<TreatmentPlan> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const conditionKey = condition.toLowerCase().replace(/\s+/g, '_')
    const treatments = mockTreatments[conditionKey] || []
    
    const plan: TreatmentPlan = {
      id: `plan_${Date.now()}`,
      analysisId,
      condition,
      severity,
      urgency: severity === 'high' ? 'immediate' : severity === 'medium' ? 'within_week' : 'monitor',
      primaryTreatments: treatments.slice(0, 2),
      alternativeTreatments: treatments.slice(2),
      preventiveMeasures: mockPreventiveTreatments,
      monitoringSchedule: {
        frequency: severity === 'high' ? 'Daily' : severity === 'medium' ? 'Every 3 days' : 'Weekly',
        duration: severity === 'high' ? '2-3 weeks' : severity === 'medium' ? '3-4 weeks' : '4-6 weeks',
        checkpoints: [
          'Check for new symptoms',
          'Monitor treatment effectiveness',
          'Assess plant recovery progress',
          'Watch for treatment side effects'
        ]
      },
      estimatedRecoveryTime: severity === 'high' ? '2-4 weeks' : severity === 'medium' ? '1-3 weeks' : '1-2 weeks',
      totalCost: '$15-45'
    }
    
    return plan
  },

  getAllTreatments: async (): Promise<Treatment[]> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return Object.values(mockTreatments).flat()
  },

  getTreatmentsByType: async (type: Treatment['type']): Promise<Treatment[]> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    const allTreatments = Object.values(mockTreatments).flat()
    return allTreatments.filter(treatment => treatment.type === type)
  },

  saveTreatmentPlan: async (_planId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    // TODO: Implement actual saving when backend is ready
  }
}