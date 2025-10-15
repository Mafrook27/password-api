const Joi = require("joi");

const createCredentialSchema = Joi.object({
  serviceName: Joi.string().min(2).max(100).required(),
  type: Joi.string().valid("banking", "email", "cloud", "social", "development", "database", "payment", "hosting", "communication", "other").default("other").required(),
  subInstanceName: Joi.string().min(1).max(100).required(),
  username: Joi.string().min(1).max(100).required(),
  password: Joi.string().min(1).required(),
  url: Joi.string().uri().optional().allow(''),
  notes: Joi.string().max(500).optional().allow('')
});

const updateCredentialSchema = Joi.object({
  serviceName: Joi.string().min(2).max(100).optional(),
  type: Joi.string().valid("banking", "email", "cloud", "social", "development", "database", "payment", "hosting", "communication", "other").optional(),
  subInstanceName: Joi.string().min(1).max(100).optional(),
  username: Joi.string().min(1).max(100).optional(),
  password: Joi.string().min(1).optional(),
  url: Joi.string().uri().optional().allow(''),
  notes: Joi.string().max(500).optional().allow('')
});
const shareCredentialSchema = Joi.object({
  userId: Joi.string().required()
});

module.exports = { 
  createCredentialSchema, 
  updateCredentialSchema, 
  shareCredentialSchema 
};