import uuid
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from app.db.base import Base


def generate_slug() -> str:
    return str(uuid.uuid4())


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[int] = mapped_column(primary_key=True)
    uuid_slug: Mapped[str] = mapped_column(String(36), unique=True, index=True, default=generate_slug)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(500), default="Untitled Form")
    description: Mapped[str] = mapped_column(Text, default="")
    cover_image: Mapped[str] = mapped_column(String(500), nullable=True)
    theme_color: Mapped[str] = mapped_column(String(7), default="#6366f1")
    settings_json: Mapped[str] = mapped_column(Text, default="{}")
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner: Mapped["User"] = relationship("User", back_populates="forms")
    questions: Mapped[list["Question"]] = relationship(
        "Question", back_populates="form", cascade="all, delete-orphan", order_by="Question.order_index"
    )
    responses: Mapped[list["Response"]] = relationship("Response", back_populates="form", cascade="all, delete-orphan")
