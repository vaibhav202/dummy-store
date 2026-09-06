const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const {
  normalizeEmail,
  validateEmail,
  validateLoginPayload,
  validatePasswordChangePayload,
  validateSignupPayload,
} = require('./validators');
const {
  requireRole,
  ROLES,
} = require('./roleMiddleware');

const router = express.Router();
const ALL_ROLES = Object.freeze(Object.values(ROLES));
const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = '2h';

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    address: user.address,
    role: user.role,
  };
}

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: JWT_EXPIRES_IN,
    },
  );
}

async function checkEmail(request, response, next) {
  const email = typeof request.query.email === 'string'
    ? request.query.email
    : '';
  const emailError = validateEmail(email);

  if (emailError) {
    return response.status(400).json({ errors: { email: emailError } });
  }

  try {
    const result = await pool.query(
      `SELECT EXISTS(
         SELECT 1
         FROM users
         WHERE LOWER(email) = LOWER($1)
       ) AS exists`,
      [normalizeEmail(email)],
    );

    return response.status(200).json({ exists: result.rows[0].exists });
  } catch (error) {
    return next(error);
  }
}

async function signup(request, response, next) {
  const validation = validateSignupPayload(request.body);
  if (!validation.valid) {
    return response.status(400).json({ errors: validation.errors });
  }

  try {
    const passwordHash = await bcrypt.hash(validation.values.password, BCRYPT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, address, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, address, role`,
      [
        validation.values.name,
        validation.values.email,
        passwordHash,
        validation.values.address,
        ROLES.NORMAL_USER,
      ],
    );

    const user = result.rows[0];
    return response.status(201).json({
      token: signToken(user),
      user: toPublicUser(user),
    });
  } catch (error) {
    if (error.code === '23505') {
      return response.status(409).json({
        error: 'An account with that email already exists.',
      });
    }

    return next(error);
  }
}

async function login(request, response, next) {
  const validation = validateLoginPayload(request.body);
  if (!validation.valid) {
    return response.status(400).json({ errors: validation.errors });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, address, role, password_hash
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [normalizeEmail(validation.values.email)],
    );
    const user = result.rows[0];

    if (!user) {
      return response.status(401).json({ error: 'Email or password is incorrect.' });
    }

    const passwordMatches = await bcrypt.compare(
      validation.values.password,
      user.password_hash,
    );
    if (!passwordMatches) {
      return response.status(401).json({ error: 'Email or password is incorrect.' });
    }

    return response.status(200).json({
      token: signToken(user),
      user: toPublicUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

// Password changes require the current password as confirmation before replacing the hash.
async function changePassword(request, response, next) {
  const validation = validatePasswordChangePayload(request.body);
  if (!validation.valid) {
    return response.status(400).json({ errors: validation.errors });
  }

  try {
    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1',
      [request.user.sub],
    );
    const user = result.rows[0];

    if (!user) {
      return response.status(401).json({ error: 'Authenticated user was not found.' });
    }

    const currentPasswordMatches = await bcrypt.compare(
      validation.values.currentPassword,
      user.password_hash,
    );
    if (!currentPasswordMatches) {
      return response.status(401).json({ error: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(validation.values.newPassword, BCRYPT_ROUNDS);
    await pool.query(
      `UPDATE users
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, request.user.sub],
    );

    return response.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    return next(error);
  }
}

function logout(request, response) {
  return response.status(200).json({
    message: 'Logged out successfully.',
  });
}

router.get('/auth/check-email', checkEmail);
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.patch('/auth/password', requireRole(...ALL_ROLES), changePassword);
router.post('/auth/logout', requireRole(...ALL_ROLES), logout);

module.exports = {
  changePassword,
  checkEmail,
  login,
  logout,
  router,
  signup,
  toPublicUser,
};
