from pydantic import BaseModel
from typing import Optional, Any, List
from enum import Enum
import json


class QuestionType(str, Enum):
    SHORT_ANSWER = "short_answer"
    LONG_ANSWER = "long_answer"
    MULTIPLE_CHOICE = "multiple_choice"
    CHECKBOXES = "checkboxes"
    DROPDOWN = "dropdown"
    LINEAR_SCALE = "linear_scale"
    MULTIPLE_CHOICE_GRID = "multiple_choice_grid"
    CHECKBOX_GRID = "checkbox_grid"
    DATE = "date"
    TIME = "time"
    DATETIME = "datetime"
    FILE_UPLOAD = "file_upload"
    NUMBER = "number"
    EMAIL = "email"
    PHONE = "phone"
    URL = "url"
    RATING = "rating"
    SECTION_HEADER = "section_header"
    PAGE_BREAK = "page_break"


class QuestionCreate(BaseModel):
    type: QuestionType
    label: str = ""
    help_text: str = ""
    is_required: bool = False
    options: List[Any] = []
    validation: dict = {}
    logic: dict = {}
    order_index: int = 0


class QuestionUpdate(BaseModel):
    type: Optional[QuestionType] = None
    label: Optional[str] = None
    help_text: Optional[str] = None
    is_required: Optional[bool] = None
    options: Optional[List[Any]] = None
    validation: Optional[dict] = None
    logic: Optional[dict] = None
    order_index: Optional[int] = None


class QuestionOut(BaseModel):
    id: int
    form_id: int
    order_index: int
    type: str
    label: str
    help_text: str
    is_required: bool
    options: List[Any]
    validation: dict
    logic: dict

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, q):
        return cls(
            id=q.id,
            form_id=q.form_id,
            order_index=q.order_index,
            type=q.type,
            label=q.label,
            help_text=q.help_text,
            is_required=q.is_required,
            options=json.loads(q.options_json) if q.options_json else [],
            validation=json.loads(q.validation_json) if q.validation_json else {},
            logic=json.loads(q.logic_json) if q.logic_json else {},
        )


class ReorderRequest(BaseModel):
    order: List[int]
