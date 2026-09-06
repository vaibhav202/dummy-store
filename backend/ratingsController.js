const pool = require('./db');
const { validateRating } = require('./validators');

function parsePositiveInteger(value) {
  const parsedValue = Number(value);

  return Number.isSafeInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : null;
}

async function submitRating(request, response, next) {
  const body = request.body && typeof request.body === 'object'
    ? request.body
    : {};
  const errors = {};
  const storeId = parsePositiveInteger(body.storeId);
  const ratingError = validateRating(body.rating);

  if (storeId === null) {
    errors.storeId = 'Store ID must be a positive integer.';
  }

  if (ratingError) {
    errors.rating = ratingError;
  }

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ errors });
  }

  try {
    const result = await pool.query(
      `INSERT INTO ratings (user_id, store_id, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, store_id)
       DO UPDATE SET rating = EXCLUDED.rating, updated_at = now()
       RETURNING id, user_id, store_id, rating, created_at, updated_at`,
      [request.user.sub, storeId, body.rating],
    );

    const rating = result.rows[0];

    return response.status(200).json({
      rating: {
        id: rating.id,
        userId: rating.user_id,
        storeId: rating.store_id,
        rating: Number(rating.rating),
        ratedAt: rating.updated_at,
        createdAt: rating.created_at,
      },
    });
  } catch (error) {
    if (error.code === '23503') {
      return response.status(404).json({ error: 'Store not found.' });
    }

    return next(error);
  }
}

module.exports = {
  parsePositiveInteger,
  submitRating,
};
