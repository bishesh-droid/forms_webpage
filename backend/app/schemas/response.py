from pydantic import BaseModel
from typing import Optional, Any, List
from datetime import datetime


class AnswerIn(BaseModel):
    question_id: int
    value_text: Optional[str] = None
    value_json: Optional[Any] = None


class SubmitRequest(BaseModel):
    answers: List[AnswerIn]
    draft_id: Optional[str] = None


class AnswerOut(BaseModel):
    id: int
    question_id: int
    value_text: Optional[str]
    value_json: Optional[Any]
    file_path: Optional[str]

    model_config = {"from_attributes": True}


class ResponseOut(BaseModel):
    id: int
    form_id: int
    respondent_id: Optional[int]
    submitted_at: datetime
    ip: Optional[str]
    user_agent: Optional[str]
    answers: List[AnswerOut] = []

    model_config = {"from_attributes": True}


class PaginatedResponses(BaseModel):
    items: List[ResponseOut]
    total: int
    page: int
    limit: int
    pages: int
