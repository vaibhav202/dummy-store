const express = require('express');
const { requireRole, ROLES } = require('./roleMiddleware');
const {
  createUser,
  getUserDetail,
  listUsers,
} = require('./usersController');

const router = express.Router();

router.post(
  '/',
  requireRole(ROLES.SYSTEM_ADMINISTRATOR),
  createUser,
);

router.get(
  '/',
  requireRole(ROLES.SYSTEM_ADMINISTRATOR),
  listUsers,
);

router.get(
  '/:userId',
  requireRole(ROLES.SYSTEM_ADMINISTRATOR),
  getUserDetail,
);

module.exports = router;
