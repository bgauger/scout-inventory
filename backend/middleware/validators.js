const { body, param, validationResult } = require('express-validator');

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validation rules for boxes
const boxValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Box name must be 1-255 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex code'),
  body('weight')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Weight must be between 0 and 10000'),
  body('notes')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Notes must be less than 5000 characters'),
  body('lastInspection')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('inTrailer')
    .optional()
    .isBoolean()
    .withMessage('inTrailer must be a boolean'),
  validate
];

// Validation rules for items
const itemValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Item name must be 1-255 characters'),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Quantity must be between 1 and 10000'),
  body('needsReplacement')
    .optional()
    .isBoolean()
    .withMessage('needsReplacement must be a boolean'),
  validate
];

// Validation rules for profiles
const profileValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Profile name must be 1-255 characters'),
  body('requiredBoxes')
    .optional()
    .isArray()
    .withMessage('requiredBoxes must be an array'),
  body('requiredBoxes.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Box IDs must be positive integers'),
  validate
];

// Validation rules for templates
const templateValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Template name must be 1-255 characters'),
  body('items')
    .optional()
    .isArray()
    .withMessage('Items must be an array'),
  body('items.*.name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Item name must be 1-255 characters'),
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Quantity must be between 1 and 10000'),
  validate
];

// Validation for login
const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Username is required'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  validate
];

// Validation for user creation
const userValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-50 characters (alphanumeric, _, -)'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'editor', 'viewer'])
    .withMessage('Role must be admin, editor, or viewer'),
  validate
];

// ID parameter validation
const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  validate
];

module.exports = {
  boxValidation,
  itemValidation,
  profileValidation,
  templateValidation,
  loginValidation,
  userValidation,
  idValidation,
  validate
};
