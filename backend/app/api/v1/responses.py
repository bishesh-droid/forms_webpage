from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import json
import math
from app.db.session import get_db
from app.models.form import Form
from app.models.question import Question
from app.models.response import Response as FormResponse, Answer
from app.models.user import User
from app.schemas.response import ResponseOut, AnswerOut, PaginatedResponses
from app.core.dependencies import get_current_user

router = APIRouter(tags=["responses"])


async def get_owned_form(form_id: int, user: User, db: AsyncSession) -> Form:
    result = await db.execute(select(Form).where(Form.id == form_id, Form.owner_id == user.id))
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


def build_response_out(resp: FormResponse) -> ResponseOut:
    answers = [
        AnswerOut(
            id=a.id,
            question_id=a.question_id,
            value_text=a.value_text,
            value_json=json.loads(a.value_json) if a.value_json else None,
            file_path=a.file_path,
        )
        for a in resp.answers
    ]
    return ResponseOut(
        id=resp.id,
        form_id=resp.form_id,
        respondent_id=resp.respondent_id,
        submitted_at=resp.submitted_at,
        ip=resp.ip,
        user_agent=resp.user_agent,
        answers=answers,
    )


@router.get("/forms/{form_id}/responses", response_model=PaginatedResponses)
async def list_responses(
    form_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_form(form_id, current_user, db)
    total = await db.scalar(select(func.count()).where(FormResponse.form_id == form_id))
    offset = (page - 1) * limit
    result = await db.execute(
        select(FormResponse)
        .where(FormResponse.form_id == form_id)
        .order_by(FormResponse.submitted_at.desc())
        .offset(offset)
        .limit(limit)
        .options(__import__("sqlalchemy.orm", fromlist=["selectinload"]).selectinload(FormResponse.answers))
    )
    responses = result.scalars().all()
    return PaginatedResponses(
        items=[build_response_out(r) for r in responses],
        total=total or 0,
        page=page,
        limit=limit,
        pages=math.ceil((total or 0) / limit),
    )


@router.get("/responses/{response_id}", response_model=ResponseOut)
async def get_response(response_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(FormResponse).where(FormResponse.id == response_id).options(selectinload(FormResponse.answers))
    )
    resp = result.scalar_one_or_none()
    if not resp:
        raise HTTPException(status_code=404, detail="Response not found")
    await get_owned_form(resp.form_id, current_user, db)
    return build_response_out(resp)


@router.delete("/responses/{response_id}", status_code=204)
async def delete_response(response_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FormResponse).where(FormResponse.id == response_id))
    resp = result.scalar_one_or_none()
    if not resp:
        raise HTTPException(status_code=404, detail="Response not found")
    await get_owned_form(resp.form_id, current_user, db)
    await db.delete(resp)


@router.get("/forms/{form_id}/export")
async def export_responses(
    form_id: int,
    format: str = Query("csv", pattern="^(csv|json|xlsx)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_form(form_id, current_user, db)
    from sqlalchemy.orm import selectinload

    q_result = await db.execute(select(Question).where(Question.form_id == form_id).order_by(Question.order_index))
    questions = q_result.scalars().all()

    r_result = await db.execute(
        select(FormResponse)
        .where(FormResponse.form_id == form_id)
        .order_by(FormResponse.submitted_at)
        .options(selectinload(FormResponse.answers))
    )
    responses = r_result.scalars().all()

    if format == "csv":
        from app.utils.csv_export import export_csv
        content = export_csv(questions, responses)
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=responses_{form_id}.csv"},
        )
    elif format == "json":
        data = []
        for resp in responses:
            row = {"response_id": resp.id, "submitted_at": resp.submitted_at.isoformat()}
            for q in questions:
                ans = next((a for a in resp.answers if a.question_id == q.id), None)
                row[q.label or f"q_{q.id}"] = ans.value_text if ans else None
            data.append(row)
        content = json.dumps(data, ensure_ascii=False, indent=2)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=responses_{form_id}.json"},
        )
    else:
        from app.utils.xlsx_export import export_xlsx
        content = export_xlsx(questions, responses)
        return StreamingResponse(
            iter([content]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=responses_{form_id}.xlsx"},
        )


@router.get("/forms/{form_id}/analytics")
async def get_analytics(form_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await get_owned_form(form_id, current_user, db)
    from sqlalchemy.orm import selectinload

    q_result = await db.execute(select(Question).where(Question.form_id == form_id).order_by(Question.order_index))
    questions = q_result.scalars().all()

    r_result = await db.execute(
        select(FormResponse)
        .where(FormResponse.form_id == form_id)
        .options(selectinload(FormResponse.answers))
    )
    responses = r_result.scalars().all()

    total = len(responses)
    analytics = []

    for q in questions:
        answers = [a for r in responses for a in r.answers if a.question_id == q.id]
        options = json.loads(q.options_json) if q.options_json else []

        if q.type in ("multiple_choice", "checkboxes", "dropdown", "linear_scale", "rating"):
            counts: dict = {}
            for ans in answers:
                if ans.value_json:
                    vals = json.loads(ans.value_json)
                    if isinstance(vals, list):
                        for v in vals:
                            counts[str(v)] = counts.get(str(v), 0) + 1
                    else:
                        counts[str(vals)] = counts.get(str(vals), 0) + 1
                elif ans.value_text:
                    counts[ans.value_text] = counts.get(ans.value_text, 0) + 1

            chart_data = [{"label": k, "count": v} for k, v in sorted(counts.items())]
            analytics.append({"question_id": q.id, "label": q.label, "type": q.type, "chart": "bar", "data": chart_data, "total_answers": len(answers)})

        elif q.type in ("short_answer", "long_answer", "email", "url", "phone"):
            texts = [a.value_text for a in answers if a.value_text]
            analytics.append({"question_id": q.id, "label": q.label, "type": q.type, "chart": "text", "data": texts[:50], "total_answers": len(texts)})

        elif q.type == "number":
            nums = []
            for a in answers:
                try:
                    nums.append(float(a.value_text))
                except Exception:
                    pass
            avg = sum(nums) / len(nums) if nums else 0
            analytics.append({"question_id": q.id, "label": q.label, "type": q.type, "chart": "histogram", "data": nums, "avg": avg, "total_answers": len(nums)})

        else:
            analytics.append({"question_id": q.id, "label": q.label, "type": q.type, "chart": "none", "data": [], "total_answers": len(answers)})

    return {"total_responses": total, "questions": analytics}
