const pool = require('./db');
const { validateStorePayload } = require('./validators');
const { ROLES } = require('./roleMiddleware');

const STORE_SORT_COLUMNS = Object.freeze({
  name: 's.name',
  email: 's.email',
  address: 's.address',
  overallRating: 'overall_rating',
  overall_rating: 'overall_rating',
  rating: 'overall_rating',
  userRating: 'user_rating',
  user_rating: 'user_rating',
});

function resolveStoreSort(sortBy) {
  const requestedSort = typeof sortBy === 'string' ? sortBy : '';

  if (Object.prototype.hasOwnProperty.call(STORE_SORT_COLUMNS, requestedSort)) {
    return {
      key: requestedSort,
      column: STORE_SORT_COLUMNS[requestedSort],
    };
  }

  return {
    key: 'name',
    column: STORE_SORT_COLUMNS.name,
  };
}

function resolveSortOrder(order) {
  return typeof order === 'string' && order.toLowerCase() === 'desc'
    ? 'DESC'
    : 'ASC';
}

function toPublicStore(store, includeEmail) {
  const publicStore = {
    id: store.id,
    name: store.name,
    address: store.address,
    overallRating: store.overall_rating == null
      ? 0
      : Number(store.overall_rating),
    userRating: store.user_rating == null
      ? null
      : Number(store.user_rating),
  };

  if (includeEmail) {
    publicStore.email = store.email;
  }

  return publicStore;
}

async function listStores(request, response, next) {
  const search = typeof request.query.search === 'string'
    ? request.query.search.trim()
    : '';
  const searchPattern = `%${search}%`;
  const sort = resolveStoreSort(request.query.sortBy);
  const order = resolveSortOrder(request.query.order);

  try {
    const result = await pool.query(
      `SELECT s.*,
              COALESCE(AVG(r.rating), 0)::numeric(10,2) AS overall_rating,
              MAX(CASE WHEN r.user_id = $2 THEN r.rating END) AS user_rating
       FROM stores s
       LEFT JOIN ratings r ON r.store_id = s.id
       WHERE s.name ILIKE $1 OR s.address ILIKE $1
       GROUP BY s.id
       ORDER BY ${sort.column} ${order}`,
      [searchPattern, request.user.sub],
    );

    const includeEmail = request.user.role === ROLES.SYSTEM_ADMINISTRATOR;

    return response.status(200).json({
      stores: result.rows.map((store) => toPublicStore(store, includeEmail)),
      query: {
        search,
        sortBy: sort.key,
        order: order.toLowerCase(),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function createStore(request, response, next) {
  const validation = validateStorePayload(request.body);

  if (!validation.valid) {
    return response.status(400).json({ errors: validation.errors });
  }

  try {
    const result = await pool.query(
      `INSERT INTO stores (name, email, address)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, address`,
      [
        validation.values.name,
        validation.values.email,
        validation.values.address,
      ],
    );

    const store = toPublicStore(
      {
        ...result.rows[0],
        overall_rating: 0,
        user_rating: null,
      },
      true,
    );

    return response.status(201).json({ store });
  } catch (error) {
    if (error.code === '23505') {
      return response.status(409).json({
        error: 'A store with that email already exists.',
      });
    }

    return next(error);
  }
}

module.exports = {
  createStore,
  listStores,
  resolveSortOrder,
  resolveStoreSort,
  toPublicStore,
};
