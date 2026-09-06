#!/usr/bin/env bash

set -u

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-AdminPass!9}"
NORMAL_EMAIL="${NORMAL_EMAIL:-smoke-normal-${BASHPID:-$$}@example.com}"
NORMAL_PASSWORD="${NORMAL_PASSWORD:-NormalPass!9}"
NEW_NORMAL_PASSWORD="${NEW_NORMAL_PASSWORD:-NormalPass@8}"
OWNER_EMAIL="${OWNER_EMAIL:-smoke-owner-${BASHPID:-$$}@example.com}"
OWNER_PASSWORD="${OWNER_PASSWORD:-OwnerPass!9}"
STORE_EMAIL="${STORE_EMAIL:-smoke-store-${BASHPID:-$$}@example.com}"
TEMP_DIR="$(mktemp -d)"
FAILURES=0

cleanup() {
  rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

request() {
  local output_file="$1"
  shift
  local status

  status="$(curl -sS \
    -o "$output_file" \
    -w '%{http_code}' \
    "$@" \
    2>"$TEMP_DIR/curl-error.txt")"

  if [ "$?" -ne 0 ]; then
    status="000"
  fi

  printf '%s' "$status"
}

assert_status() {
  local number="$1"
  local description="$2"
  local expected="$3"
  local actual="$4"

  if [ "$actual" = "$expected" ]; then
    printf 'PASS %s. %s (expected %s, got %s)\n' \
      "$number" "$description" "$expected" "$actual"
  else
    printf 'FAIL %s. %s (expected %s, got %s)\n' \
      "$number" "$description" "$expected" "$actual"
    FAILURES=$((FAILURES + 1))
  fi
}

check_token() {
  local number="$1"
  local description="$2"
  local token="$3"

  if [ -n "$token" ]; then
    printf 'PASS %s. %s (token present)\n' "$number" "$description"
  else
    printf 'FAIL %s. %s (token missing)\n' "$number" "$description"
    FAILURES=$((FAILURES + 1))
  fi
}

check_value() {
  local number="$1"
  local description="$2"
  local value="$3"

  if [ -n "$value" ]; then
    printf 'PASS %s. %s\n' "$number" "$description"
  else
    printf 'FAIL %s. %s\n' "$number" "$description"
    FAILURES=$((FAILURES + 1))
  fi
}

check_equal() {
  local number="$1"
  local description="$2"
  local expected="$3"
  local actual="$4"

  if [ -n "$expected" ] && [ "$expected" = "$actual" ]; then
    printf 'PASS %s. %s\n' "$number" "$description"
  else
    printf 'FAIL %s. %s (expected values to match)\n' "$number" "$description"
    FAILURES=$((FAILURES + 1))
  fi
}

check_body_pattern() {
  local number="$1"
  local description="$2"
  local body_file="$3"
  local pattern="$4"

  if grep -Eq "$pattern" "$body_file"; then
    printf 'PASS %s. %s\n' "$number" "$description"
  else
    printf 'FAIL %s. %s\n' "$number" "$description"
    FAILURES=$((FAILURES + 1))
  fi
}

extract_token() {
  local body_file="$1"

  sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^\"]*\)".*/\1/p' \
    "$body_file"
}

extract_json_value() {
  local body_file="$1"
  local field="$2"

  sed -n -E "s/.*\"${field}\"[[:space:]]*:[[:space:]]*\"?([^\",}]+)\"?.*/\1/p" \
    "$body_file" \
    | sed -n '1p'
}

cat >"$TEMP_DIR/admin-login.json" <<JSON
{
  "email": "$ADMIN_EMAIL",
  "password": "$ADMIN_PASSWORD"
}
JSON

status="$(request "$TEMP_DIR/admin-login-response.json" \
  -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  --data-binary "@$TEMP_DIR/admin-login.json")"
assert_status 1 "administrator login" 200 "$status"
ADMIN_TOKEN="$(extract_token "$TEMP_DIR/admin-login-response.json")"
check_token 1 "administrator login response" "$ADMIN_TOKEN"

cat >"$TEMP_DIR/create-store.json" <<JSON
{
  "name": "Harbor Pine Downtown Market",
  "email": "$STORE_EMAIL",
  "address": "14 Harbor Avenue, Portland, OR 97205"
}
JSON

status="$(request "$TEMP_DIR/create-store-response.json" \
  -X POST "$BASE_URL/api/stores" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --data-binary "@$TEMP_DIR/create-store.json")"
assert_status 2 "administrator creates a store" 201 "$status"
STORE_ID="$(extract_json_value "$TEMP_DIR/create-store-response.json" id)"
check_value 2 "created store has an id" "$STORE_ID"

cat >"$TEMP_DIR/create-normal-user.json" <<JSON
{
  "name": "Normal User Created For Smoke Test",
  "email": "$NORMAL_EMAIL",
  "password": "$NORMAL_PASSWORD",
  "address": "22 Normal User Street, Portland, OR 97205",
  "role": "NORMAL_USER"
}
JSON

status="$(request "$TEMP_DIR/create-normal-user-response.json" \
  -X POST "$BASE_URL/api/users" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --data-binary "@$TEMP_DIR/create-normal-user.json")"
assert_status 3 "administrator creates a normal user" 201 "$status"

cat >"$TEMP_DIR/create-store-owner.json" <<JSON
{
  "name": "Store Owner Created For Smoke Test",
  "email": "$OWNER_EMAIL",
  "password": "$OWNER_PASSWORD",
  "address": "88 Owner Avenue, Portland, OR 97205",
  "role": "STORE_OWNER",
  "storeId": "$STORE_ID"
}
JSON

status="$(request "$TEMP_DIR/create-store-owner-response.json" \
  -X POST "$BASE_URL/api/users" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --data-binary "@$TEMP_DIR/create-store-owner.json")"
assert_status 4 "administrator creates and assigns a Store Owner" 201 "$status"

cat >"$TEMP_DIR/normal-login.json" <<JSON
{
  "email": "$NORMAL_EMAIL",
  "password": "$NORMAL_PASSWORD"
}
JSON

status="$(request "$TEMP_DIR/normal-login-response.json" \
  -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  --data-binary "@$TEMP_DIR/normal-login.json")"
assert_status 5 "normal user login" 200 "$status"
NORMAL_TOKEN="$(extract_token "$TEMP_DIR/normal-login-response.json")"
check_token 5 "normal user login response" "$NORMAL_TOKEN"

status="$(request "$TEMP_DIR/store-search-response.json" \
  -G "$BASE_URL/api/stores" \
  -H "Authorization: Bearer $NORMAL_TOKEN" \
  --data-urlencode 'search=Harbor')"
assert_status 6 "normal user searches stores by name or address" 200 "$status"
check_body_pattern 6 "store search returns the created store" \
  "$TEMP_DIR/store-search-response.json" \
  'Harbor Pine Downtown Market'

status="$(request "$TEMP_DIR/invalid-sort-response.json" \
  -G "$BASE_URL/api/stores" \
  -H "Authorization: Bearer $NORMAL_TOKEN" \
  --data-urlencode 'sortBy=not_a_real_column' \
  --data-urlencode 'order=desc')"
assert_status 7 "invalid store sort is ignored instead of becoming SQL" 200 "$status"
check_body_pattern 7 "invalid store sort falls back to name" \
  "$TEMP_DIR/invalid-sort-response.json" \
  '"sortBy":"name"'

cat >"$TEMP_DIR/submit-rating.json" <<JSON
{
  "storeId": "$STORE_ID",
  "rating": 3
}
JSON

status="$(request "$TEMP_DIR/submit-rating-response.json" \
  -X POST "$BASE_URL/api/ratings" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $NORMAL_TOKEN" \
  --data-binary "@$TEMP_DIR/submit-rating.json")"
assert_status 8 "normal user submits a store rating" 200 "$status"
FIRST_RATING_ID="$(extract_json_value "$TEMP_DIR/submit-rating-response.json" id)"
check_value 8 "first rating response has an id" "$FIRST_RATING_ID"

cat >"$TEMP_DIR/modify-rating.json" <<JSON
{
  "storeId": "$STORE_ID",
  "rating": 5
}
JSON

status="$(request "$TEMP_DIR/modify-rating-response.json" \
  -X POST "$BASE_URL/api/ratings" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $NORMAL_TOKEN" \
  --data-binary "@$TEMP_DIR/modify-rating.json")"
assert_status 9 "normal user modifies the same store rating" 200 "$status"
SECOND_RATING_ID="$(extract_json_value "$TEMP_DIR/modify-rating-response.json" id)"
check_equal 10 "rating modification reuses the existing rating row" \
  "$FIRST_RATING_ID" "$SECOND_RATING_ID"
check_body_pattern 9 "modified rating response contains the new value" \
  "$TEMP_DIR/modify-rating-response.json" \
  '"rating":5'

status="$(request "$TEMP_DIR/updated-store-response.json" \
  -G "$BASE_URL/api/stores" \
  -H "Authorization: Bearer $NORMAL_TOKEN" \
  --data-urlencode 'search=Harbor')"
assert_status 11 "normal user lists stores after modifying a rating" 200 "$status"
check_body_pattern 11 "store list shows the updated own rating" \
  "$TEMP_DIR/updated-store-response.json" \
  '"userRating":5'

cat >"$TEMP_DIR/change-password.json" <<JSON
{
  "currentPassword": "$NORMAL_PASSWORD",
  "newPassword": "$NEW_NORMAL_PASSWORD"
}
JSON

status="$(request "$TEMP_DIR/change-password-response.json" \
  -X PATCH "$BASE_URL/api/auth/password" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $NORMAL_TOKEN" \
  --data-binary "@$TEMP_DIR/change-password.json")"
assert_status 12 "normal user changes password" 200 "$status"

cat >"$TEMP_DIR/owner-login.json" <<JSON
{
  "email": "$OWNER_EMAIL",
  "password": "$OWNER_PASSWORD"
}
JSON

status="$(request "$TEMP_DIR/owner-login-response.json" \
  -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  --data-binary "@$TEMP_DIR/owner-login.json")"
assert_status 13 "Store Owner login" 200 "$status"
OWNER_TOKEN="$(extract_token "$TEMP_DIR/owner-login-response.json")"
check_token 13 "Store Owner login response" "$OWNER_TOKEN"

status="$(request "$TEMP_DIR/owner-dashboard-response.json" \
  "$BASE_URL/api/dashboard/store-owner" \
  -H "Authorization: Bearer $OWNER_TOKEN")"
assert_status 14 "Store Owner views own dashboard" 200 "$status"
check_body_pattern 14 "owner dashboard includes the rater" \
  "$TEMP_DIR/owner-dashboard-response.json" \
  'Normal User Created For Smoke Test'
check_body_pattern 14 "owner dashboard includes the average rating" \
  "$TEMP_DIR/owner-dashboard-response.json" \
  '"averageRating":5'

status="$(request "$TEMP_DIR/normal-admin-denial-response.json" \
  "$BASE_URL/api/dashboard/admin" \
  -H "Authorization: Bearer $NORMAL_TOKEN")"
assert_status 15 "normal user is denied administrator dashboard" 403 "$status"

status="$(request "$TEMP_DIR/no-token-response.json" \
  "$BASE_URL/api/stores")"
assert_status 16 "unauthenticated request is denied" 401 "$status"

status="$(request "$TEMP_DIR/admin-logout-response.json" \
  -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $ADMIN_TOKEN")"
assert_status 17 "administrator logout" 200 "$status"

if [ "$FAILURES" -eq 0 ]; then
  printf 'All smoke checks passed.\n'
else
  printf '%s smoke check(s) failed.\n' "$FAILURES"
fi

exit "$FAILURES"
