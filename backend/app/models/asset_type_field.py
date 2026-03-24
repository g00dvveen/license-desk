from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin

if TYPE_CHECKING:
    from app.models.asset_type import AssetType


class AssetTypeField(BaseMixin, Base):
    __tablename__ = "asset_type_fields"
    __table_args__ = (UniqueConstraint("type_id", "name", name="uq_asset_type_field_name"),)

    type_id: Mapped[int] = mapped_column(ForeignKey("asset_types.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    data_type: Mapped[str] = mapped_column(String(50))  # string, number, date, boolean, reference
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)

    asset_type: Mapped[AssetType] = relationship(back_populates="fields")
