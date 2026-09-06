const pool = require('./db');

async function getAdminDashboard(request, response, next) {
  try {
    const [usersResult, storesResult, ratingsResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total_users FROM users'),
      pool.query('SELECT COUNT(*)::int AS total_stores FROM stores'),
      pool.query('SELECT COUNT(*)::int AS total_ratings FROM ratings'),
    ]);

    return response.status(200).json({
      totalUsers: usersResult.rows[0].total_users,
      totalStores: storesResult.rows[0].total_stores,
      totalRatings: ratingsResult.rows[0].total_ratings,
    });
  } catch (error) {
    return next(error);
  }
}

async function getStoreOwnerDashboard(request, response, next) {
  try {
    const storeResult = await pool.query(
      `SELECT id, name, email, address
       FROM stores
       WHERE owner_id = $1
       LIMIT 1`,
      [request.user.sub],
    );

    const store = storeResult.rows[0];

    if (!store) {
      return response.status(404).json({
        error: 'No store is assigned to this Store Owner.',
      });
    }

    const ratingsResult = await pool.query(
      `SELECT u.id, u.name, u.email, r.rating, r.created_at,
              AVG(r.rating) OVER () AS store_average
       FROM ratings r
       JOIN users u ON u.id = r.user_id
       WHERE r.store_id = $1
       ORDER BY r.created_at DESC`,
      [store.id],
    );

    const rows = ratingsResult.rows;
    const averageRating = rows.length > 0
      ? Number(rows[0].store_average)
      : 0;

    return response.status(200).json({
      store: {
        id: store.id,
        name: store.name,
        email: store.email,
        address: store.address,
      },
      averageRating,
      raters: rows.map((row) => ({
        userId: row.id,
        name: row.name,
        rating: Number(row.rating),
        ratedAt: row.created_at,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAdminDashboard,
  getStoreOwnerDashboard,
};
