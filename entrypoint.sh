#!/bin/bash

echo "Waiting for database..."
until bundle exec rails db:prepare 2>&1; do
  echo "Database not ready, retrying in 3s..."
  sleep 3
done

exec "$@"
