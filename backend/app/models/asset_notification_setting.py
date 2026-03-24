from sqlalchemy import Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import BaseMixin


class AssetNotificationSetting(BaseMixin, Base):
    __tablename__ = "asset_notification_settings"
    __table_args__ = (
        UniqueConstraint("asset_id", "days_before", name="uq_asset_notification_days"),
    )

    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"))
    days_before: Mapped[int] = mapped_column(Integer)
