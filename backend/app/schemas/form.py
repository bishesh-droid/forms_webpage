from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
import json


class FormSettings(BaseModel):
    accept_responses: bool = True
    one_response_per_user: bool = False
    require_login: bool = False
    show_progress_bar: bool = True
    shuffle_questions: bool = False
    response_limit: Optional[int] = None
    open_at: Optional[datetime] = None
    close_at: Optional[datetime] = None
    confirmation_message: str = "Your response has been recorded."


class FormCreate(BaseModel):
    title: str = "Untitled Form"
    description: str = ""
    theme_color: str = "#6366f1"
    settings: FormSettings = FormSettings()


class FormUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    theme_color: Optional[str] = None
    cover_image: Optional[str] = None
    settings: Optional[FormSettings] = None
    is_published: Optional[bool] = None
    is_archived: Optional[bool] = None


class FormOut(BaseModel):
    id: int
    uuid_slug: str
    title: str
    description: str
    theme_color: str
    cover_image: Optional[str]
    is_published: bool
    is_archived: bool
    settings: FormSettings
    created_at: datetime
    updated_at: datetime
    question_count: int = 0
    response_count: int = 0

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_counts(cls, form, question_count: int = 0, response_count: int = 0):
        settings_data = json.loads(form.settings_json) if form.settings_json else {}
        return cls(
            id=form.id,
            uuid_slug=form.uuid_slug,
            title=form.title,
            description=form.description,
            theme_color=form.theme_color,
            cover_image=form.cover_image,
            is_published=form.is_published,
            is_archived=form.is_archived,
            settings=FormSettings(**settings_data),
            created_at=form.created_at,
            updated_at=form.updated_at,
            question_count=question_count,
            response_count=response_count,
        )
