#!/usr/bin/env bash
# Seed dummy publishers against the local or remote ad server.
# Usage: ./scripts/seed-publishers.sh [BASE_URL]
# Default BASE_URL: http://localhost:3000

BASE="${1:-http://localhost:3000}"

publishers=(
  "ramp@ramp.com"
  "linear@linear.app"
  "fly@fly.io"
)

for email in "${publishers[@]}"; do
  echo -n "Registering $email ... "
  curl -s -X POST "$BASE/v1/publisher/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\"}" | jq .
done
