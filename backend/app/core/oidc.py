import jwt
from jwt import PyJWKClient

from app.config import settings

_jwks_client: PyJWKClient | None = None


def get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(settings.keycloak_jwks_url, cache_keys=True)
    return _jwks_client


def decode_keycloak_token(token: str) -> dict:
    """Decode and validate a Keycloak-issued RS256 JWT using JWKS."""
    client = get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token)
    # Accept both internal and public issuer URLs
    # Keycloak sets issuer based on the URL used to request the token
    valid_issuers = {settings.keycloak_issuer_url, settings.keycloak_public_issuer_url}
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=settings.keycloak_client_id,
        issuer=list(valid_issuers),
    )
