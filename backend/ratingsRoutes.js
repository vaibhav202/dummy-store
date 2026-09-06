const express = require('express');
const { requireRole, ROLES } = require('./roleMiddleware');
const { submitRating } = require('./ratingsController');

const router = express.Router();

router.post(
  '/',
  requireRole(ROLES.NORMAL_USER),
  submitRating,
);

module.exports = router;
