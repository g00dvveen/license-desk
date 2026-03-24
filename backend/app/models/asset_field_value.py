from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin

if TYPE_CHECKING:
    from app.models.asset import Asset
    from app.models.asset_type_field import AssetTypeField


class AssetFieldValue(BaseMixin, Base):
    __tablename__ = "asset_field_values"
    __table_args__ = (UniqueConstraint("asset_id", "field_id", name="uq_asset_field_value"),)

    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"))
    field_id: Mapped[int] = mapped_column(ForeignKey("asset_type_fields.id", ondelete="CASCADE"))
    value: Mapped[dict | None] = mapped_column(JSONB)

    asset: Mapped[Asset] = relationship(back_populates="field_values")
    field: Mapped[AssetTypeField] = relationship()
