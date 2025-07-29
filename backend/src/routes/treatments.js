const express = require('express');
const { runQuery, getQuery, allQuery } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { 
  validationSchemas, 
  validate, 
  sanitizeInput,
  createEndpointRateLimit 
} = require('../middleware/validation');

const router = express.Router();

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Rate limiting for treatment endpoints
const treatmentRateLimit = createEndpointRateLimit(20, 60); // 20 requests per minute

// Get treatment plan for analysis
router.get('/plan/:analysisId', 
  authenticateToken,
  treatmentRateLimit,
  validate(validationSchemas.idParam, 'params'),
  asyncHandler(async (req, res) => {
  const analysis = await getQuery(`
    SELECT id, user_id, condition, title, severity
    FROM analyses WHERE id = ?
  `, [req.params.analysisId]);

  if (!analysis) {
    throw new AppError('Analysis not found', 404);
  }

  // Check if user owns this analysis
  if (analysis.user_id !== req.user.id && !['agronomist', 'admin'].includes(req.user.role)) {
    throw new AppError('Access denied', 403);
  }

  // Check if treatment plan already exists
  let treatmentPlan = await getQuery(`
    SELECT * FROM treatment_plans WHERE analysis_id = ?
  `, [req.params.analysisId]);

  if (!treatmentPlan) {
    // Generate new treatment plan
    treatmentPlan = await generateTreatmentPlan(analysis);
    
    // Save to database
    const result = await runQuery(`
      INSERT INTO treatment_plans (
        analysis_id, user_id, condition, severity, urgency,
        primary_treatments, alternative_treatments, preventive_measures,
        monitoring_schedule, estimated_recovery_time, total_cost, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      analysis.id,
      analysis.user_id,
      treatmentPlan.condition,
      treatmentPlan.severity,
      treatmentPlan.urgency,
      JSON.stringify(treatmentPlan.primaryTreatments),
      JSON.stringify(treatmentPlan.alternativeTreatments),
      JSON.stringify(treatmentPlan.preventiveMeasures),
      JSON.stringify(treatmentPlan.monitoringSchedule),
      treatmentPlan.estimatedRecoveryTime,
      treatmentPlan.totalCost
    ]);

    treatmentPlan.id = result.id;
  } else {
    // Parse JSON fields
    treatmentPlan.primaryTreatments = JSON.parse(treatmentPlan.primary_treatments);
    treatmentPlan.alternativeTreatments = JSON.parse(treatmentPlan.alternative_treatments);
    treatmentPlan.preventiveMeasures = JSON.parse(treatmentPlan.preventive_measures);
    treatmentPlan.monitoringSchedule = JSON.parse(treatmentPlan.monitoring_schedule);
  }

  res.json({
    success: true,
    data: { treatmentPlan }
  });
}));

// Generate treatment plan based on analysis
async function generateTreatmentPlan(analysis) {
  const conditionKey = analysis.title.toLowerCase().replace(/\s+/g, '_');
  
  // Get matching treatments
  const treatments = await allQuery(`
    SELECT * FROM treatments 
    WHERE target_conditions LIKE ? AND is_active = 1
    ORDER BY effectiveness DESC
  `, [`%${conditionKey}%`]);

  // Get preventive treatments
  const preventiveTreatments = await allQuery(`
    SELECT * FROM treatments 
    WHERE type = 'preventive' AND is_active = 1
    ORDER BY effectiveness DESC
    LIMIT 3
  `, []);

  // Parse JSON fields for treatments
  const parseTreatment = (treatment) => ({
    ...treatment,
    ingredients: JSON.parse(treatment.ingredients || '[]'),
    instructions: JSON.parse(treatment.instructions || '[]'),
    warnings: JSON.parse(treatment.warnings || '[]'),
    targetConditions: JSON.parse(treatment.target_conditions || '[]')
  });

  const primaryTreatments = treatments.slice(0, 2).map(parseTreatment);
  const alternativeTreatments = treatments.slice(2, 4).map(parseTreatment);
  const preventiveMeasures = preventiveTreatments.map(parseTreatment);

  // Determine urgency based on severity
  const urgency = analysis.severity === 'high' ? 'immediate' : 
                 analysis.severity === 'medium' ? 'within_week' : 'monitor';

  // Generate monitoring schedule
  const monitoringSchedule = {
    frequency: analysis.severity === 'high' ? 'Daily' : 
              analysis.severity === 'medium' ? 'Every 3 days' : 'Weekly',
    duration: analysis.severity === 'high' ? '2-3 weeks' : 
             analysis.severity === 'medium' ? '3-4 weeks' : '4-6 weeks',
    checkpoints: [
      'Check for new symptoms',
      'Monitor treatment effectiveness',
      'Assess plant recovery progress',
      'Watch for treatment side effects'
    ]
  };

  return {
    condition: analysis.title,
    severity: analysis.severity,
    urgency,
    primaryTreatments,
    alternativeTreatments,
    preventiveMeasures,
    monitoringSchedule,
    estimatedRecoveryTime: analysis.severity === 'high' ? '2-4 weeks' : 
                          analysis.severity === 'medium' ? '1-3 weeks' : '1-2 weeks',
    totalCost: '$15-45'
  };
}

// Get all treatments
router.get('/', 
  authenticateToken,
  treatmentRateLimit,
  validate(validationSchemas.treatmentQuery, 'query'),
  asyncHandler(async (req, res) => {
  const { type, condition } = req.query;
  
  let whereConditions = ['is_active = 1'];
  let queryParams = [];

  if (type) {
    whereConditions.push('type = ?');
    queryParams.push(type);
  }

  if (condition) {
    whereConditions.push('target_conditions LIKE ?');
    queryParams.push(`%${condition}%`);
  }

  const treatments = await allQuery(`
    SELECT id, name, type, description, effectiveness, application_method,
           frequency, safety_period, cost, difficulty, target_conditions
    FROM treatments
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY effectiveness DESC, name ASC
  `, queryParams);

  // Parse JSON fields
  const parsedTreatments = treatments.map(treatment => ({
    ...treatment,
    targetConditions: JSON.parse(treatment.target_conditions || '[]')
  }));

  res.json({
    success: true,
    data: { treatments: parsedTreatments }
  });
}));

// Get specific treatment details
router.get('/:id', 
  authenticateToken,
  treatmentRateLimit,
  validate(validationSchemas.idParam, 'params'),
  asyncHandler(async (req, res) => {
  const treatment = await getQuery(`
    SELECT * FROM treatments WHERE id = ? AND is_active = 1
  `, [req.params.id]);

  if (!treatment) {
    throw new AppError('Treatment not found', 404);
  }

  // Parse JSON fields
  const parsedTreatment = {
    ...treatment,
    ingredients: JSON.parse(treatment.ingredients || '[]'),
    instructions: JSON.parse(treatment.instructions || '[]'),
    warnings: JSON.parse(treatment.warnings || '[]'),
    targetConditions: JSON.parse(treatment.target_conditions || '[]')
  };

  res.json({
    success: true,
    data: { treatment: parsedTreatment }
  });
}));

// Save treatment to user's list
router.post('/:id/save', 
  authenticateToken,
  treatmentRateLimit,
  validate(validationSchemas.idParam, 'params'),
  validate(validationSchemas.saveTreatment),
  asyncHandler(async (req, res) => {
  const { notes } = req.body;

  // Check if treatment exists
  const treatment = await getQuery('SELECT id FROM treatments WHERE id = ? AND is_active = 1', [req.params.id]);
  if (!treatment) {
    throw new AppError('Treatment not found', 404);
  }

  // Check if already saved
  const existing = await getQuery(`
    SELECT id FROM user_treatments WHERE user_id = ? AND treatment_id = ?
  `, [req.user.id, req.params.id]);

  if (existing) {
    throw new AppError('Treatment already saved', 409);
  }

  // Save treatment
  await runQuery(`
    INSERT INTO user_treatments (user_id, treatment_id, notes, saved_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `, [req.user.id, req.params.id, notes || null]);

  res.status(201).json({
    success: true,
    message: 'Treatment saved successfully'
  });
}));

// Get user's saved treatments
router.get('/saved/list', authenticateToken, asyncHandler(async (req, res) => {
  const savedTreatments = await allQuery(`
    SELECT t.id, t.name, t.type, t.description, t.effectiveness,
           ut.notes, ut.saved_at
    FROM user_treatments ut
    JOIN treatments t ON ut.treatment_id = t.id
    WHERE ut.user_id = ? AND t.is_active = 1
    ORDER BY ut.saved_at DESC
  `, [req.user.id]);

  res.json({
    success: true,
    data: { treatments: savedTreatments }
  });
}));

// Remove saved treatment
router.delete('/saved/:id', authenticateToken, asyncHandler(async (req, res) => {
  const result = await runQuery(`
    DELETE FROM user_treatments 
    WHERE user_id = ? AND treatment_id = ?
  `, [req.user.id, req.params.id]);

  if (result.changes === 0) {
    throw new AppError('Saved treatment not found', 404);
  }

  res.json({
    success: true,
    message: 'Treatment removed from saved list'
  });
}));

// Admin: Add new treatment
router.post('/admin/create', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const treatmentSchema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('organic', 'biological', 'cultural', 'preventive').required(),
    description: Joi.string().required(),
    ingredients: Joi.array().items(Joi.string()).required(),
    instructions: Joi.array().items(Joi.string()).required(),
    effectiveness: Joi.number().min(0).max(1).required(),
    applicationMethod: Joi.string().required(),
    frequency: Joi.string().required(),
    safetyPeriod: Joi.string().required(),
    cost: Joi.string().valid('low', 'medium', 'high').required(),
    difficulty: Joi.string().valid('easy', 'moderate', 'advanced').required(),
    seasonalNotes: Joi.string().optional(),
    warnings: Joi.array().items(Joi.string()).optional(),
    targetConditions: Joi.array().items(Joi.string()).required()
  });

  const { error, value } = treatmentSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const result = await runQuery(`
    INSERT INTO treatments (
      name, type, description, ingredients, instructions, effectiveness,
      application_method, frequency, safety_period, cost, difficulty,
      seasonal_notes, warnings, target_conditions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [
    value.name, value.type, value.description, 
    JSON.stringify(value.ingredients), JSON.stringify(value.instructions),
    value.effectiveness, value.applicationMethod, value.frequency,
    value.safetyPeriod, value.cost, value.difficulty,
    value.seasonalNotes || null, JSON.stringify(value.warnings || []),
    JSON.stringify(value.targetConditions)
  ]);

  res.status(201).json({
    success: true,
    message: 'Treatment created successfully',
    data: { treatmentId: result.id }
  });
}));

module.exports = router;