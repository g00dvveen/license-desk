from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import BaseMixin


class Project(BaseMixin, Base):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(255))
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id"))
