#!/bin/sh
set -e

# Write runtime config.json into the webroot.
# This file is fetched by the SPA before it initialises,
# so Keycloak coordinates are injected at container start
# rather than baked into the build artefact.
cat > /usr/share/nginx/html/config.json <<EOF
{
  "authority": "${KEYCLOAK_AUTHORITY}",
  "clientId": "${KEYCLOAK_CLIENT_ID}"
}
EOF

exec "$@"
