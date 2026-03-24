from datetime import date as Date, datetime
from typing import Any, Optional

from pydantic import BaseModel


# --- Asset ---


class AssetFieldValueWrite(BaseModel):
    field_id: int
    value: Any


class AssetCreate(BaseModel):
    name: str
    type_id: int
    organization_id: int
    project_id: int | None = None
    cost: float = 0
    currency_id: int
    purchase_date: Date
    next_payment_date: Date | None = None
    renewal_period_id: int | None = None
    renewal_type: str = "fixed"  # fixed | manual
    admin_account: str | None = None
    comment: str | None = None
    field_values: list[AssetFieldValueWrite] = []


class AssetUpdate(BaseModel):
    name: str | None = None
    type_id: int | None = None
    organization_id: int | None = None
    project_id: int | None = None
    cost: float | None = None
    currency_id: int | None = None
    purchase_date: Date | None = None
    next_payment_date: Date | None = None
    renewal_period_id: int | None = None
    renewal_type: str | None = None
    notifications_enabled: bool | None = None
    admin_account: str | None = None
    comment: str | None = None


class AssetFieldValueRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    asset_id: int
    field_id: int
    value: Any


class AssetRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    type_id: int
    organization_id: int
    project_id: int | None
    cost: float
    currency_id: int
    purchase_date: Date
    next_payment_date: Date | None
    renewal_period_id: int | None
    admin_account: str | None
    comment: str | None
    renewal_type: str = "fixed"
    notifications_enabled: bool = True
    is_archived: bool = False
    field_values: list[AssetFieldValueRead] = []


# --- Cost History ---


class CostHistoryRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    asset_id: int
    old_value: float
    new_value: float
    currency_id: int
    old_currency_id: int | None = None
    changed_by: int
    changed_at: datetime


# --- Payment ---


class PaymentCreate(BaseModel):
    date: Date
    amount: float
    currency_id: int
    comment: str | None = None
    next_payment_date: Optional[Date] = None  # used for manual renewal_type


class PaymentUpdate(BaseModel):
    date: Optional[Date] = None
    amount: float | None = None
    currency_id: int | None = None
    comment: str | None = None


class PaymentRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    asset_id: int
    date: Date
    amount: float
    currency_id: int
    comment: str | None
    invoice_url: str | None = None
    invoice_filename: str | None = None
    created_by: int
    created_at: datetime


# --- Notification Settings ---


class AssetNotificationSettingWrite(BaseModel):
    days_before: list[int]


class AssetNotificationSettingRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    asset_id: int
    days_before: int
