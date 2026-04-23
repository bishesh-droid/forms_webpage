from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slowapi import Limiter
from slowapi.util import get_remote_address
import json
from datetime import datetime, timezone
import bleach
from app.db.session import get_db
from app.models.form import Form
from app.models.question import Question
from app.models.response import Response as FormResponse, Answer
from app.schemas.question import QuestionOut
from app.schemas.response import SubmitRequest
from app.core.dependencies import get_optional_user

router = APIRouter(prefix="/public", tags=["public"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/forms/{slug}")
async def get_public_form(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Form).where(Form.uuid_slug == slug))
    form = result.scalar_one_or_none()
    if not form or not form.is_published:
        raise HTTPException(status_code=404, detail="Form not found or not published")

    settings = json.loads(form.settings_json) if form.settings_json else {}

    now = datetime.now(timezone.utc)
    open_at = settings.get("open_at")
    close_at = settings.get("close_at")
    if open_at and datetime.fromisoformat(open_at) > now:
        raise HTTPException(status_code=403, detail="Form not yet open")
    if close_at and datetime.fromisoformat(close_at) < now:
        raise HTTPException(status_code=403, detail="Form is closed")
    if not settings.get("accept_responses", True):
        raise HTTPException(status_code=403, detail="Form is not accepting responses")

    q_result = await db.execute(select(Question).where(Question.form_id == form.id).order_by(Question.order_index))
    questions = q_result.scalars().all()

    return {
        "id": form.id,
        "uuid_slug": form.uuid_slug,
        "title": form.title,
        "description": form.description,
        "theme_color": form.theme_color,
        "cover_image": form.cover_image,
        "settings": settings,
        "questions": [QuestionOut.from_orm(q).model_dump() for q in questions],
    }


@router.post("/forms/{slug}/submit", status_code=201)
@limiter.limit("10/minute")
async def submit_form(
    slug: str,
    req: SubmitRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    result = await db.execute(select(Form).where(Form.uuid_slug == slug))
    form = result.scalar_one_or_none()
    if not form or not form.is_published:
        raise HTTPException(status_code=404, detail="Form not found")

    settings = json.loads(form.settings_json) if form.settings_json else {}

    if settings.get("require_login") and not current_user:
        raise HTTPException(status_code=401, detail="Login required to submit")

    response_limit = settings.get("response_limit")
    if response_limit:
        from sqlalchemy import func
        count = await db.scalar(select(func.count()).where(FormResponse.form_id == form.id))
        if count >= response_limit:
            raise HTTPException(status_code=403, detail="Response limit reached")

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")[:500]

    resp = FormResponse(
        form_id=form.id,
        respondent_id=current_user.id if current_user else None,
        ip=ip,
        user_agent=ua,
    )
    db.add(resp)
    await db.flush()

    q_result = await db.execute(select(Question).where(Question.form_id == form.id))
    questions = {q.id: q for q in q_result.scalars().all()}

    for ans_in in req.answers:
        q = questions.get(ans_in.question_id)
        if not q:
            continue

        value_text = ans_in.value_text
        if value_text and q.type in ("long_answer", "short_answer"):
            value_text = bleach.clean(value_text, tags=[], strip=True)

        value_json = None
        if ans_in.value_json is not None:
            value_json = json.dumps(ans_in.value_json)

        answer = Answer(
            response_id=resp.id,
            question_id=ans_in.question_id,
            value_text=value_text,
            value_json=value_json,
        )
        db.add(answer)

    await db.flush()

    confirmation = settings.get("confirmation_message", "Your response has been recorded.")
    return {"response_id": resp.id, "message": confirmation}
