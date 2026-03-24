from sqlalchemy import String, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import BaseMixin


class UserPermission(BaseMixin, Base):
    __tablename__ = "user_permissions"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "role",
            "organization_id",
            "project_id",
            name="uq_user_permission",
        ),
        CheckConstraint(
            "project_id IS NULL OR organization_id IS NOT NULL",
            name="ck_project_requires_org",
        ),
    )

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(20))  # manager, viewer
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id"))
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"))
