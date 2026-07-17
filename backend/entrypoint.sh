#!/bin/sh
set -e

# docker-compose.yml already gates the backend service on the db/redis
# healthchecks (depends_on: condition: service_healthy), so no extra
# wait-for-it logic is needed here.

exec "$@"
