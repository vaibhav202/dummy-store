const bcrypt = require('bcrypt');
const pool = require('./db');
const {
  normalizeEmail,
  validateAddress,
  validateEmail,
  validateName,
  validatePassword,
} = require('./validators');
const { ROLES } = require('./roleMiddleware');

const BCRYPT_ROUNDS = 12;

const USER_SORT_COLUMNS = Object.freeze({
  name: 'u.name',
  email: 'u.email',
  address: 'u.address',
  role: 'u.role',
  createdAt: 'u.created_at',
  created_at: 'u.created_at',
});

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    address: user.address,
    role: user.role,
  };
}

function resolveUserSort(sortBy) {
  const requestedSort = typeof sortBy === 'string' ? sortBy : '';

  if (Object.prototype.hasOwnProperty.call(USER_SORT_COLUMNS, requestedSort)) {
    return {
      key: requestedSort,
      column: USER_SORT_COLUMNS[requestedSort],
    };
  }

  return {
    key: 'name',
    column: USER_SORT_COLUMNS.name,
  };
}

function resolveSortOrder(order) {
  return typeof order === 'string' && order.toLowerCase() === 'desc'
    ? 'DESC'
    : 'ASC';
}

function normalizeFilter(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function parsePositiveInteger(value) {
  const parsedValue = Number(value);

  return Number.isSafeInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : null;
}

function validateAdminUserPayload(payload) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const errors = {};
  const values = {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    email: typeof body.email === 'string' ? normalizeEmail(body.email) : '',
    address: typeof body.address === 'string' ? body.address.trim() : '',
    password: typeof body.password === 'string' ? body.password : '',
    role: typeof body.role === 'string' ? body.role : '',
    storeId: null,
  };

  const fieldValidators = {
    name: validateName,
    email: validateEmail,
    address: validateAddress,
    password: validatePassword,
  };

  Object.entries(fieldValidators).forEach(([field, validator]) => {
    const error = validator(body[field]);

    if (error) {
      errors[field] = error;
    }
  });

  if (!Object.values(ROLES).includes(values.role)) {
    errors.role = 'Role must be SYSTEM_ADMINISTRATOR, NORMAL_USER, or STORE_OWNER.';
  }

  if (
    Object.prototype.hasOwnProperty.call(body, 'storeId')
    && body.storeId !== null
    && body.storeId !== ''
  ) {
    values.storeId = parsePositiveInteger(body.storeId);

    if (values.storeId === null) {
      errors.storeId = 'Store ID must be a positive integer.';
    }
  }

  if (values.storeId !== null && values.role !== ROLES.STORE_OWNER) {
    errors.storeId = 'Only Store Owners can be assigned to a store.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values,
  };
}

async function insertUser(queryable, values, passwordHash) {
  const result = await queryable.query(
    `INSERT INTO users (name, email, password_hash, address, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, address, role`,
    [
      values.name,
      values.email,
      passwordHash,
      values.address,
      values.role,
    ],
  );

  return result.rows[0];
}

async function createUser(request, response, next) {
  const validation = validateAdminUserPayload(request.body);

  if (!validation.valid) {
    return response.status(400).json({ errors: validation.errors });
  }

  let client = null;
  let user;

  try {
    const passwordHash = await bcrypt.hash(
      validation.values.password,
      BCRYPT_ROUNDS,
    );

    if (validation.values.storeId !== null) {
      client = await pool.connect();
      await client.query('BEGIN');

      user = await insertUser(client, validation.values, passwordHash);

      const storeResult = await client.query(
        `UPDATE stores
         SET owner_id = $1, updated_at = NOW()
         WHERE id = $2 AND owner_id IS NULL
         RETURNING id`,
        [user.id, validation.values.storeId],
      );

      if (storeResult.rowCount === 0) {
        const assignmentError = new Error(
          'The selected store does not exist or already has an owner.',
        );
        assignmentError.status = 409;
        throw assignmentError;
      }

      await client.query('COMMIT');
    } else {
      user = await insertUser(pool, validation.values, passwordHash);
    }

    const result = {
      user: toPublicUser(user),
    };

    if (validation.values.storeId !== null) {
      result.storeId = validation.values.storeId;
    }

    return response.status(201).json(result);
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back user creation', rollbackError);
      }
    }

    if (error.code === '23505') {
      return response.status(409).json({
        error: 'A user with that email already exists or the store already has an owner.',
      });
    }

    if (error.status) {
      return response.status(error.status).json({ error: error.message });
    }

    return next(error);
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function listUsers(request, response, next) {
  const sort = resolveUserSort(request.query.sortBy);
  const order = resolveSortOrder(request.query.order);
  const search = normalizeFilter(request.query.search);
  const filters = [
    search,
    normalizeFilter(request.query.name),
    normalizeFilter(request.query.email),
    normalizeFilter(request.query.address),
    normalizeFilter(request.query.role),
  ];

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.address, u.role
       FROM users u
       WHERE (
           $1::text IS NULL
           OR u.name ILIKE '%' || $1 || '%'
           OR u.email ILIKE '%' || $1 || '%'
           OR u.address ILIKE '%' || $1 || '%'
           OR u.role ILIKE '%' || $1 || '%'
       )
         AND ($2::text IS NULL OR u.name ILIKE '%' || $2 || '%')
         AND ($3::text IS NULL OR u.email ILIKE '%' || $3 || '%')
         AND ($4::text IS NULL OR u.address ILIKE '%' || $4 || '%')
         AND ($5::text IS NULL OR u.role ILIKE '%' || $5 || '%')
       ORDER BY ${sort.column} ${order}, u.id ASC`,
      filters,
    );

    return response.status(200).json({
      users: result.rows.map(toPublicUser),
      query: {
        search: filters[0],
        name: filters[1],
        email: filters[2],
        address: filters[3],
        role: filters[4],
        sortBy: sort.key,
        order: order.toLowerCase(),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getUserDetail(request, response, next) {
  const userId = parsePositiveInteger(request.params.userId);

  if (userId === null) {
    return response.status(400).json({ error: 'User ID must be a positive integer.' });
  }

  try {
    const userResult = await pool.query(
      `SELECT id, name, email, address, role
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );

    const user = userResult.rows[0];

    if (!user) {
      return response.status(404).json({ error: 'User not found.' });
    }

    const detail = toPublicUser(user);

    if (user.role === ROLES.STORE_OWNER) {
      const storeResult = await pool.query(
        `SELECT s.id, s.name, s.email, s.address,
                COALESCE(AVG(r.rating), 0)::numeric(10,2) AS average_rating
         FROM stores s
         LEFT JOIN ratings r ON r.store_id = s.id
         WHERE s.owner_id = $1
         GROUP BY s.id
         LIMIT 1`,
        [user.id],
      );

      const ownedStore = storeResult.rows[0];
      detail.averageRating = ownedStore
        ? Number(ownedStore.average_rating)
        : 0;

      if (ownedStore) {
        detail.store = {
          id: ownedStore.id,
          name: ownedStore.name,
          email: ownedStore.email,
          address: ownedStore.address,
          averageRating: detail.averageRating,
        };
      }
    }

    return response.status(200).json({ user: detail });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createUser,
  getUserDetail,
  listUsers,
  resolveSortOrder,
  resolveUserSort,
  toPublicUser,
  validateAdminUserPayload,
};
