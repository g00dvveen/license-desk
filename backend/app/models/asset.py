from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, ForeignKey, Numeric, Date, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin

if TYPE_CHECKING:
    from app.models.asset_field_value import AssetFieldValue
    from app.models.asset_type import AssetType
    from app.models.currency import Currency
    from app.models.organization import Organization
    from app.models.project import Project
    from app.models.renewal_period import RenewalPeriod


class Asset(BaseMixin, Base):
    __tablename__ = "assets"
    __table_args__ = (
        Index("ix_assets_type_id", "type_id"),
        Index("ix_assets_organization_id", "organization_id"),
        Index("ix_assets_project_id", "project_id"),
        Index("ix_assets_next_payment_date", "next_payment_date"),
    )

    name: Mapped[str] = mapped_column(String(255))
    type_id: Mapped[int] = mapped_column(ForeignKey("asset_types.id"))
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"))
    cost: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    currency_id: Mapped[int] = mapped_column(ForeignKey("currencies.id"))
    purchase_date: Mapped[date] = mapped_column(Date)
    next_payment_date: Mapped[date | None] = mapped_column(Date)
    renewal_period_id: Mapped[int | None] = mapped_column(ForeignKey("renewal_periods.id"))
    admin_account: Mapped[str | None] = mapped_column(String(255))
    comment: Mapped[str | None] = mapped_column(Text)
    renewal_type: Mapped[str] = mapped_column(String(20), default="fixed")  # fixed | manual
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    asset_type: Mapped[AssetType] = relationship()
    organization: Mapped[Organization] = relationship()
    project: Mapped[Project] = relationship()
    currency: Mapped[Currency] = relationship()
    renewal_period: Mapped[RenewalPeriod] = relationship()
    field_values: Mapped[list[AssetFieldValue]] = relationship(
        back_populates="asset", cascade="all, delete-orphan"
    )
