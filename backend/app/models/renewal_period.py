from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import BaseMixin


class RenewalPeriod(BaseMixin, Base):
    __tablename__ = "renewal_periods"

    name: Mapped[str] = mapped_column(String(100))
    months: Mapped[int] = mapped_column(Integer)
