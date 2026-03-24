from datetime import date

from sqlalchemy import ForeignKey, Numeric, Date, Text, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import BaseMixin


class AssetPayment(BaseMixin, Base):
    __tablename__ = "asset_payments"

    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"))
    date: Mapped[date] = mapped_column(Date)
    amount: Mapped[float] = mapped_column(Numeric(15, 2))
    currency_id: Mapped[int] = mapped_column(ForeignKey("currencies.id"))
    comment: Mapped[str | None] = mapped_column(Text)
    invoice_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    invoice_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
