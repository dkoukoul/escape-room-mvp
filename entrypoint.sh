#!/bin/sh
set -e

# Wait for the database to be reachable
echo "Waiting for the database..."
until bunx prisma db push; do
  echo "Database not ready yet, retrying in 2 seconds..."
  sleep 2
done

echo "Database initialized with tables!"

# Execute the command passed to the script
exec "$@"
