from pydantic import BaseModel


# --- Organization ---


class OrganizationCreate(BaseModel):
    name: str
    external_id: str | None = None
    bin: str | None = None
    full_name: str | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = None
    external_id: str | None = None
    bin: str | None = None
    full_name: str | None = None


class OrganizationRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    external_id: str | None = None
    bin: str | None = None
    full_name: str | None = None


# --- Project ---


class ProjectCreate(BaseModel):
    name: str
    organization_id: int | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    organization_id: int | None = None


class ProjectRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    organization_id: int | None


# --- Currency ---


class CurrencyCreate(BaseModel):
    code: str
    name: str
    symbol: str


class CurrencyUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    symbol: str | None = None


class CurrencyRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    code: str
    name: str
    symbol: str


# --- RenewalPeriod ---


class RenewalPeriodCreate(BaseModel):
    name: str
    months: int


class RenewalPeriodUpdate(BaseModel):
    name: str | None = None
    months: int | None = None


class RenewalPeriodRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    months: int


# --- AssetType ---


class AssetTypeFieldCreate(BaseModel):
    name: str
    data_type: str  # string, number, date, boolean, reference
    sort_order: int = 0
    is_hidden: bool = False


class AssetTypeFieldUpdate(BaseModel):
    name: str | None = None
    data_type: str | None = None
    sort_order: int | None = None
    is_hidden: bool | None = None


class AssetTypeFieldRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    type_id: int
    name: str
    data_type: str
    sort_order: int
    is_hidden: bool


class AssetTypeCreate(BaseModel):
    name: str
    description: str | None = None
    fields: list[AssetTypeFieldCreate] = []


class AssetTypeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class AssetTypeRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    description: str | None
    fields: list[AssetTypeFieldRead] = []
