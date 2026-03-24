from datetime import datetime

from sqlalchemy import ForeignKey, Numeric, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AssetCostHistory(Base):
    __tablename__ = "asset_cost_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"))
    old_value: Mapped[float] = mapped_column(Numeric(15, 2))
    new_value: Mapped[float] = mapped_column(Numeric(15, 2))
    currency_id: Mapped[int] = mapped_column(ForeignKey("currencies.id"))
    old_currency_id: Mapped[int | None] = mapped_column(ForeignKey("currencies.id"), nullable=True)
    changed_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
