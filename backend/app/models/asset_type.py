from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin

if TYPE_CHECKING:
    from app.models.asset_type_field import AssetTypeField


class AssetType(BaseMixin, Base):
    __tablename__ = "asset_types"

    name: Mapped[str] = mapped_column(String(255), unique=True)
    description: Mapped[str | None] = mapped_column(Text)

    fields: Mapped[list[AssetTypeField]] = relationship(
        back_populates="asset_type",
        order_by="AssetTypeField.sort_order",
        cascade="all, delete-orphan",
    )
