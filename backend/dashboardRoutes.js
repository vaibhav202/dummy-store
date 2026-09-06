const express = require('express');
const { requireRole, ROLES } = require('./roleMiddleware');
const {
  getAdminDashboard,
  getStoreOwnerDashboard,
} = require('./dashboardController');

const router = express.Router();

router.get(
  '/admin',
  requireRole(ROLES.SYSTEM_ADMINISTRATOR),
  getAdminDashboard,
);

router.get(
  '/store-owner',
  requireRole(ROLES.STORE_OWNER),
  getStoreOwnerDashboard,
);

module.exports = router;
