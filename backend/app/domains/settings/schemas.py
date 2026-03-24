from typing import Any

from pydantic import BaseModel


class SettingRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    key: str
    value: Any


class SettingUpdate(BaseModel):
    value: Any
