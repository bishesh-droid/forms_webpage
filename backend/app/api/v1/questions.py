from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
from datetime import datetime, timezone
from app.db.session import get_db
from app.models.form import Form
from app.models.question import Question
from app.models.user import User
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionOut, ReorderRequest
from app.core.dependencies import get_current_user

router = APIRouter(tags=["questions"])


async def get_owned_form(form_id: int, user: User, db: AsyncSession) -> Form:
    result = await db.execute(select(Form).where(Form.id == form_id, Form.owner_id == user.id))
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


@router.post("/forms/{form_id}/questions", response_model=QuestionOut, status_code=201)
async def create_question(form_id: int, req: QuestionCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await get_owned_form(form_id, current_user, db)
    result = await db.execute(select(Question).where(Question.form_id == form_id).order_by(Question.order_index.desc()))
    last = result.scalars().first()
    order = (last.order_index + 1) if last else 0

    q = Question(
        form_id=form_id,
        order_index=req.order_index if req.order_index > 0 else order,
        type=req.type.value,
        label=req.label,
        help_text=req.help_text,
        is_required=req.is_required,
        options_json=json.dumps(req.options),
        validation_json=json.dumps(req.validation),
        logic_json=json.dumps(req.logic),
    )
    db.add(q)
    await db.flush()
    await db.refresh(q)
    return QuestionOut.from_orm(q)


@router.patch("/questions/{question_id}", response_model=QuestionOut)
async def update_question(question_id: int, req: QuestionUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    await get_owned_form(q.form_id, current_user, db)

    if req.type is not None:
        q.type = req.type.value
    if req.label is not None:
        q.label = req.label
    if req.help_text is not None:
        q.help_text = req.help_text
    if req.is_required is not None:
        q.is_required = req.is_required
    if req.options is not None:
        q.options_json = json.dumps(req.options)
    if req.validation is not None:
        q.validation_json = json.dumps(req.validation)
    if req.logic is not None:
        q.logic_json = json.dumps(req.logic)
    if req.order_index is not None:
        q.order_index = req.order_index

    await db.flush()
    await db.refresh(q)
    return QuestionOut.from_orm(q)


@router.delete("/questions/{question_id}", status_code=204)
async def delete_question(question_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    await get_owned_form(q.form_id, current_user, db)
    await db.delete(q)


@router.post("/forms/{form_id}/questions/reorder", status_code=200)
async def reorder_questions(form_id: int, req: ReorderRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await get_owned_form(form_id, current_user, db)
    for idx, qid in enumerate(req.order):
        result = await db.execute(select(Question).where(Question.id == qid, Question.form_id == form_id))
        q = result.scalar_one_or_none()
        if q:
            q.order_index = idx
    await db.flush()
    return {"message": "Reordered"}
