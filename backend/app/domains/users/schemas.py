from pydantic import BaseModel


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
    is_superuser: bool


class UserCreate(BaseModel):
    email: str
    last_name: str
    first_name: str
    middle_name: str | None = None
    password: str
    is_superuser: bool = False


class UserUpdate(BaseModel):
    last_name: str | None = None
    first_name: str | None = None
    middle_name: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None


class PermissionCreate(BaseModel):
    user_id: int
    role: str  # manager, viewer
    organization_id: int | None = None
    project_id: int | None = None


class PermissionRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int
    role: str
    organization_id: int | None
    project_id: int | None
