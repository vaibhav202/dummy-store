const express = require('express');
const { requireRole, ROLES } = require('./roleMiddleware');
const {
  createStore,
  listStores,
} = require('./storesController');

const router = express.Router();

router.get(
  '/',
  requireRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.NORMAL_USER),
  listStores,
);

router.post(
  '/',
  requireRole(ROLES.SYSTEM_ADMINISTRATOR),
  createStore,
);

module.exports = router;
