from sqlalchemy import String, Boolean, ForeignKey, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id"))
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    type: Mapped[str] = mapped_column(String(50))
    label: Mapped[str] = mapped_column(Text, default="")
    help_text: Mapped[str] = mapped_column(Text, default="")
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    options_json: Mapped[str] = mapped_column(Text, default="[]")
    validation_json: Mapped[str] = mapped_column(Text, default="{}")
    logic_json: Mapped[str] = mapped_column(Text, default="{}")

    form: Mapped["Form"] = relationship("Form", back_populates="questions")
    answers: Mapped[list["Answer"]] = relationship("Answer", back_populates="question", cascade="all, delete-orphan")
