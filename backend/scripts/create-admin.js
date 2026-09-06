const path = require('node:path');

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.join(__dirname, '..', '.env'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

const bcrypt = require('bcrypt');
const pool = require('../db');
const {
  normalizeEmail,
  validateAddress,
  validateEmail,
  validateName,
  validatePassword,
} = require('../validators');
const { ROLES } = require('../roleMiddleware');

const BCRYPT_ROUNDS = 12;

function getBootstrapValues() {
  return {
    name: typeof process.env.BOOTSTRAP_ADMIN_NAME === 'string'
      ? process.env.BOOTSTRAP_ADMIN_NAME.trim()
      : '',
    email: typeof process.env.BOOTSTRAP_ADMIN_EMAIL === 'string'
      ? normalizeEmail(process.env.BOOTSTRAP_ADMIN_EMAIL)
      : '',
    address: typeof process.env.BOOTSTRAP_ADMIN_ADDRESS === 'string'
      ? process.env.BOOTSTRAP_ADMIN_ADDRESS.trim()
      : '',
    password: typeof process.env.BOOTSTRAP_ADMIN_PASSWORD === 'string'
      ? process.env.BOOTSTRAP_ADMIN_PASSWORD
      : '',
  };
}

function validateBootstrapValues(values) {
  const validators = {
    name: validateName,
    email: validateEmail,
    address: validateAddress,
    password: validatePassword,
  };
  const errors = {};

  Object.entries(validators).forEach(([field, validator]) => {
    const error = validator(values[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
}

async function main() {
  const values = getBootstrapValues();
  const errors = validateBootstrapValues(values);

  if (Object.keys(errors).length > 0) {
    console.error('Bootstrap administrator validation failed:');
    Object.entries(errors).forEach(([field, message]) => {
      console.error(`- ${field}: ${message}`);
    });
    process.exitCode = 1;
    await pool.end();
    return;
  }

  try {
    const existingResult = await pool.query(
      `SELECT id, role
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [values.email],
    );
    const existingUser = existingResult.rows[0];

    if (existingUser) {
      if (existingUser.role === ROLES.SYSTEM_ADMINISTRATOR) {
        console.log(`A System Administrator already exists for ${values.email}.`);
        return;
      }

      throw new Error(
        'That email already belongs to a non-administrator account. Choose another email.',
      );
    }

    const passwordHash = await bcrypt.hash(values.password, BCRYPT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, address, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, address, role`,
      [
        values.name,
        values.email,
        passwordHash,
        values.address,
        ROLES.SYSTEM_ADMINISTRATOR,
      ],
    );

    const administrator = result.rows[0];
    console.log(`Created System Administrator ${administrator.email} (id ${administrator.id}).`);
  } catch (error) {
    if (error.code === '23505') {
      console.error('An account with that email already exists.');
      process.exitCode = 1;
      return;
    }

    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Could not create the bootstrap administrator: ${error.message}`);
  process.exitCode = 1;
});
