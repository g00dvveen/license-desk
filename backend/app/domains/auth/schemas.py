from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    last_name: str
    first_name: str
    middle_name: str | None = None


class UserRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    email: str
    last_name: str
    first_name: str
    middle_name: str | None = None
    full_name: str = ""
    avatar_url: str | None = None
    is_active: bool
    is_superuser: bool = False
    role: str | None = None
    is_local: bool = False


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ProfileUpdate(BaseModel):
    last_name: str | None = None
    first_name: str | None = None
    middle_name: str | None = None
