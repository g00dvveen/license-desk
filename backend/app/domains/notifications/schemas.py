from datetime import datetime

from pydantic import BaseModel


class NotificationRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int
    title: str
    message: str
    entity_type: str | None
    entity_id: int | None
    is_read: bool
    email_sent: bool
    created_at: datetime


class UnreadCountRead(BaseModel):
    count: int
