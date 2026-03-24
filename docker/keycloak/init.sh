#!/bin/sh
# Initialize Keycloak realm, client and demo users for LicenseDesk

KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:8080}"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
REALM="license-desk"
CLIENT_ID="license-desk-app"
CLIENT_SECRET="license-desk-secret"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"

echo "Waiting for Keycloak to be ready..."
until curl -sf "${KEYCLOAK_URL}/realms/master" > /dev/null 2>&1; do
    sleep 3
done
echo "Keycloak is ready."

# Get admin token
TOKEN=$(curl -sf -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
    -d "grant_type=password" \
    -d "client_id=admin-cli" \
    -d "username=${ADMIN_USER}" \
    -d "password=${ADMIN_PASS}" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
    echo "ERROR: Failed to get admin token"
    exit 1
fi

AUTH="Authorization: Bearer ${TOKEN}"

# Check if realm exists
REALM_EXISTS=$(curl -sf -o /dev/null -w "%{http_code}" -H "$AUTH" "${KEYCLOAK_URL}/admin/realms/${REALM}")
if [ "$REALM_EXISTS" = "200" ]; then
    echo "Realm '${REALM}' already exists. Skipping."
    exit 0
fi

# Create realm
echo "Creating realm '${REALM}'..."
curl -sf -X POST "${KEYCLOAK_URL}/admin/realms" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "{
        \"realm\": \"${REALM}\",
        \"enabled\": true,
        \"displayName\": \"LicenseDesk\",
        \"loginWithEmailAllowed\": true,
        \"registrationAllowed\": false
    }"

# Create client
echo "Creating client '${CLIENT_ID}'..."
curl -sf -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/clients" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "{
        \"clientId\": \"${CLIENT_ID}\",
        \"name\": \"LicenseDesk App\",
        \"enabled\": true,
        \"protocol\": \"openid-connect\",
        \"publicClient\": false,
        \"secret\": \"${CLIENT_SECRET}\",
        \"redirectUris\": [\"${BACKEND_URL}/api/auth/oidc/callback\"],
        \"webOrigins\": [\"${FRONTEND_URL}\"],
        \"standardFlowEnabled\": true,
        \"directAccessGrantsEnabled\": false
    }"

# Create demo users
create_user() {
    email=$1; first=$2; last=$3; password=$4
    echo "Creating user '${email}'..."
    curl -sf -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users" \
        -H "$AUTH" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${email}\",
            \"username\": \"${email}\",
            \"firstName\": \"${first}\",
            \"lastName\": \"${last}\",
            \"enabled\": true,
            \"emailVerified\": true,
            \"credentials\": [{
                \"type\": \"password\",
                \"value\": \"${password}\",
                \"temporary\": false
            }]
        }"
}

create_user "admin@demo.example.com" "Aleksey" "Ivanov" "admin"
create_user "petrov@demo.example.com" "Dmitry" "Petrov" "demo"
create_user "sidorova@demo.example.com" "Elena" "Sidorova" "demo"
create_user "kozlov@demo.example.com" "Mikhail" "Kozlov" "demo"

echo ""
echo "=== Keycloak initialized ==="
echo "Realm:         ${REALM}"
echo "Client ID:     ${CLIENT_ID}"
echo "Client Secret: ${CLIENT_SECRET}"
