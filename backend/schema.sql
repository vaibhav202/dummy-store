CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    address VARCHAR(400) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'NORMAL_USER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_name_length_check
        CHECK (CHAR_LENGTH(BTRIM(name)) BETWEEN 20 AND 60),
    CONSTRAINT users_address_length_check
        CHECK (CHAR_LENGTH(BTRIM(address)) BETWEEN 1 AND 400),
    CONSTRAINT users_role_check
        CHECK (role IN ('SYSTEM_ADMINISTRATOR', 'NORMAL_USER', 'STORE_OWNER'))
);

CREATE TABLE stores (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    address VARCHAR(400) NOT NULL,
    owner_id BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT stores_name_length_check
        CHECK (CHAR_LENGTH(BTRIM(name)) BETWEEN 20 AND 60),
    CONSTRAINT stores_address_length_check
        CHECK (CHAR_LENGTH(BTRIM(address)) BETWEEN 1 AND 400)
);

CREATE TABLE ratings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ratings_value_check CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT ratings_one_per_user_per_store UNIQUE (user_id, store_id)
);

CREATE INDEX users_role_idx ON users(role);
CREATE INDEX stores_owner_id_idx ON stores(owner_id);
CREATE INDEX ratings_store_id_idx ON ratings(store_id);
CREATE INDEX ratings_user_id_idx ON ratings(user_id);
