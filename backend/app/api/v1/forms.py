from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import json
from datetime import datetime, timezone
from app.db.session import get_db
from app.models.form import Form
from app.models.question import Question
from app.models.response import Response as FormResponse
from app.models.user import User
from app.schemas.form import FormCreate, FormUpdate, FormOut, FormSettings
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/forms", tags=["forms"])


async def get_form_or_404(form_id: int, user: User, db: AsyncSession) -> Form:
    result = await db.execute(select(Form).where(Form.id == form_id, Form.owner_id == user.id))
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


@router.get("", response_model=list[FormOut])
async def list_forms(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Form).where(Form.owner_id == current_user.id, Form.is_archived == False).order_by(Form.updated_at.desc())
    )
    forms = result.scalars().all()
    out = []
    for form in forms:
        q_count = await db.scalar(select(func.count()).where(Question.form_id == form.id))
        r_count = await db.scalar(select(func.count()).where(FormResponse.form_id == form.id))
        out.append(FormOut.from_orm_with_counts(form, q_count or 0, r_count or 0))
    return out


@router.post("", response_model=FormOut, status_code=201)
async def create_form(req: FormCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    form = Form(
        owner_id=current_user.id,
        title=req.title,
        description=req.description,
        theme_color=req.theme_color,
        settings_json=req.settings.model_dump_json(),
    )
    db.add(form)
    await db.flush()
    await db.refresh(form)
    return FormOut.from_orm_with_counts(form)


@router.get("/{form_id}", response_model=dict)
async def get_form(form_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    form = await get_form_or_404(form_id, current_user, db)
    result = await db.execute(select(Question).where(Question.form_id == form.id).order_by(Question.order_index))
    questions = result.scalars().all()

    from app.schemas.question import QuestionOut
    q_out = [QuestionOut.from_orm(q) for q in questions]
    r_count = await db.scalar(select(func.count()).where(FormResponse.form_id == form.id))
    form_out = FormOut.from_orm_with_counts(form, len(q_out), r_count or 0)

    return {**form_out.model_dump(), "questions": [q.model_dump() for q in q_out]}


@router.patch("/{form_id}", response_model=FormOut)
async def update_form(form_id: int, req: FormUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    form = await get_form_or_404(form_id, current_user, db)
    if req.title is not None:
        form.title = req.title
    if req.description is not None:
        form.description = req.description
    if req.theme_color is not None:
        form.theme_color = req.theme_color
    if req.cover_image is not None:
        form.cover_image = req.cover_image
    if req.is_published is not None:
        form.is_published = req.is_published
    if req.is_archived is not None:
        form.is_archived = req.is_archived
    if req.settings is not None:
        form.settings_json = req.settings.model_dump_json()
    form.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(form)
    q_count = await db.scalar(select(func.count()).where(Question.form_id == form.id))
    r_count = await db.scalar(select(func.count()).where(FormResponse.form_id == form.id))
    return FormOut.from_orm_with_counts(form, q_count or 0, r_count or 0)


@router.delete("/{form_id}", status_code=204)
async def delete_form(form_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    form = await get_form_or_404(form_id, current_user, db)
    await db.delete(form)


@router.post("/{form_id}/duplicate", response_model=FormOut, status_code=201)
async def duplicate_form(form_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    form = await get_form_or_404(form_id, current_user, db)
    result = await db.execute(select(Question).where(Question.form_id == form.id).order_by(Question.order_index))
    questions = result.scalars().all()

    new_form = Form(
        owner_id=current_user.id,
        title=f"Copy of {form.title}",
        description=form.description,
        theme_color=form.theme_color,
        settings_json=form.settings_json,
    )
    db.add(new_form)
    await db.flush()

    for q in questions:
        new_q = Question(
            form_id=new_form.id,
            order_index=q.order_index,
            type=q.type,
            label=q.label,
            help_text=q.help_text,
            is_required=q.is_required,
            options_json=q.options_json,
            validation_json=q.validation_json,
            logic_json=q.logic_json,
        )
        db.add(new_q)

    await db.flush()
    await db.refresh(new_form)
    return FormOut.from_orm_with_counts(new_form, len(questions), 0)


@router.post("/{form_id}/publish", response_model=FormOut)
async def toggle_publish(form_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    form = await get_form_or_404(form_id, current_user, db)
    form.is_published = not form.is_published
    form.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(form)
    q_count = await db.scalar(select(func.count()).where(Question.form_id == form.id))
    r_count = await db.scalar(select(func.count()).where(FormResponse.form_id == form.id))
    return FormOut.from_orm_with_counts(form, q_count or 0, r_count or 0)
