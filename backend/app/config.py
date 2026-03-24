from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_prefix": "LICENSEDESK_", "env_file": ".env"}

    # App
    debug: bool = False
    secret_key: str = "change-me-in-production"
    allowed_origins: list[str] = ["http://localhost:5173"]

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/license_desk"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30

    # S3 Storage (optional — if disabled, local filesystem is used)
    s3_enabled: bool = False
    s3_endpoint_url: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket: str = "licensedesk"
    s3_region: str = ""
    s3_public_url: str = ""  # public URL prefix for files, e.g. https://cdn.example.com/licensedesk

    # SMTP (email notifications)
    smtp_enabled: bool = False
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "LicenseDesk"
    smtp_use_tls: bool = True

    # Keycloak OIDC (optional)
    keycloak_enabled: bool = False
    keycloak_base_url: str = ""  # internal URL for server-to-server (e.g. http://keycloak:8080)
    keycloak_public_url: str = ""  # external URL for browser redirects (e.g. http://localhost:8080)
    keycloak_realm: str = ""
    keycloak_client_id: str = ""
    keycloak_client_secret: str = ""
    keycloak_redirect_uri: str = "http://localhost:8000/api/auth/oidc/callback"
    keycloak_frontend_url: str = "http://localhost:5173"

    @property
    def keycloak_issuer_url(self) -> str:
        return f"{self.keycloak_base_url}/realms/{self.keycloak_realm}"

    @property
    def keycloak_public_issuer_url(self) -> str:
        base = self.keycloak_public_url or self.keycloak_base_url
        return f"{base}/realms/{self.keycloak_realm}"

    @property
    def keycloak_auth_url(self) -> str:
        return f"{self.keycloak_public_issuer_url}/protocol/openid-connect/auth"

    @property
    def keycloak_token_url(self) -> str:
        return f"{self.keycloak_issuer_url}/protocol/openid-connect/token"

    @property
    def keycloak_jwks_url(self) -> str:
        return f"{self.keycloak_issuer_url}/protocol/openid-connect/certs"


settings = Settings()
