#!/usr/bin/env bash

set -u

BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_EMAIL="${TEST_EMAIL:-phase-a-${BASHPID:-$$}@example.com}"
TEST_PASSWORD="ValidPass!9"
WRONG_PASSWORD="WrongPass!9"
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

  status="$(curl -sS -o "$output_file" -w '%{http_code}' "$@" 2>"$TEMP_DIR/curl-error.txt")"
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
    printf 'PASS %s. %s (expected %s, got %s)\n' "$number" "$description" "$expected" "$actual"
  else
    printf 'FAIL %s. %s (expected %s, got %s)\n' "$number" "$description" "$expected" "$actual"
    FAILURES=$((FAILURES + 1))
  fi
}

extract_token() {
  local body_file="$1"

  sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^\"]*\)".*/\1/p' "$body_file"
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

cat >"$TEMP_DIR/signup-valid.json" <<JSON
{
  "name": "Alexandra Morgan Phase Tester",
  "email": "$TEST_EMAIL",
  "address": "14 Willow Lane, Portland, OR 97205",
  "password": "$TEST_PASSWORD"
}
JSON

status="$(request "$TEMP_DIR/signup-valid-response.json" \
  -X POST "$BASE_URL/api/auth/signup" \
  -H 'Content-Type: application/json' \
  --data-binary "@$TEMP_DIR/signup-valid.json")"
assert_status 1 "valid Normal User signup" 201 "$status"
NORMAL_TOKEN="$(extract_token "$TEMP_DIR/signup-valid-response.json")"
check_token 1 "valid signup response" "$NORMAL_TOKEN"

cat >"$TEMP_DIR/signup-no-special.json" <<JSON
{
  "name": "Alexandra Morgan Missing Special",
  "email": "no-special-${BASHPID:-$$}@example.com",
  "address": "14 Willow Lane, Portland, OR 97205",
  "password": "NoSpecial9"
}
JSON
status="$(request "$TEMP_DIR/signup-no-special-response.json" \
  -X POST "$BASE_URL/api/auth/signup" \
  -H 'Content-Type: application/json' \
  --data-binary "@$TEMP_DIR/signup-no-special.json")"
assert_status 2 "signup password missing a special character" 400 "$status"

cat >"$TEMP_DIR/signup-short-name.json" <<JSON
{
  "name": "Short Name",
  "email": "short-name-${BASHPID:-$$}@example.com",
  "address": "14 Willow Lane, Portland, OR 97205",
  "password": "$TEST_PASSWORD"
}
JSON
status="$(request "$TEMP_DIR/signup-short-name-response.json" \
  -X POST "$BASE_URL/api/auth/signup" \
  -H 'Content-Type: application/json' \
  --data-binary "@$TEMP_DIR/signup-short-name.json")"
assert_status 3 "signup name under 20 characters" 400 "$status"

cat >"$TEMP_DIR/login-wrong.json" <<JSON
{
  "email": "$TEST_EMAIL",
  "password": "$WRONG_PASSWORD"
}
JSON
status="$(request "$TEMP_DIR/login-wrong-response.json" \
  -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  --data-binary "@$TEMP_DIR/login-wrong.json")"
assert_status 4 "login with wrong password" 401 "$status"

cat >"$TEMP_DIR/login-correct.json" <<JSON
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
JSON
status="$(request "$TEMP_DIR/login-correct-response.json" \
  -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  --data-binary "@$TEMP_DIR/login-correct.json")"
assert_status 5 "login with correct password" 200 "$status"
LOGIN_TOKEN="$(extract_token "$TEMP_DIR/login-correct-response.json")"
check_token 5 "valid login response" "$LOGIN_TOKEN"

status="$(request "$TEMP_DIR/no-token-response.json" \
  "$BASE_URL/api/stores")
assert_status 6 "protected store route with no token" 401 "$status"

status="$(request "$TEMP_DIR/normal-token-response.json" \
  -H "Authorization: Bearer $NORMAL_TOKEN" \
  "$BASE_URL/api/dashboard/admin")
assert_status 7 "normal-user token on administrator-only dashboard" 403 "$status"

if [ "$FAILURES" -eq 0 ]; then
  printf 'All Phase A checks passed.\n'
else
  printf '%s Phase A check(s) failed.\n' "$FAILURES"
fi

exit "$FAILURES"
