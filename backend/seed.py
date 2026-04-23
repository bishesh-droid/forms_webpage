"""Seed script — run: python seed.py"""
import asyncio
import json
from app.db.session import AsyncSessionLocal, engine
from app.db.base import Base
from app.models.user import User
from app.models.form import Form
from app.models.question import Question
from app.core.security import hash_password
import app.models  # noqa


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        existing = await db.scalar(select(User).where(User.email == "demo@example.com"))
        if existing:
            print("Demo user already exists, skipping seed.")
            return
        user = User(email="demo@example.com", hashed_password=hash_password("DemoPassword123!"), name="Demo User")
        db.add(user)
        await db.flush()

        form = Form(
            owner_id=user.id,
            title="Customer Satisfaction Survey",
            description="Help us improve our service by answering a few quick questions.",
            theme_color="#6366f1",
            is_published=True,
            settings_json=json.dumps({"accept_responses": True, "show_progress_bar": True, "confirmation_message": "Thank you for your feedback!"}),
        )
        db.add(form)
        await db.flush()

        questions = [
            Question(form_id=form.id, order_index=0, type="short_answer", label="What is your name?", is_required=True, options_json="[]", validation_json="{}", logic_json="{}"),
            Question(form_id=form.id, order_index=1, type="email", label="Email address", is_required=True, options_json="[]", validation_json="{}", logic_json="{}"),
            Question(form_id=form.id, order_index=2, type="multiple_choice", label="How satisfied are you with our service?", is_required=True,
                     options_json=json.dumps(["Very satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very dissatisfied"]), validation_json="{}", logic_json="{}"),
            Question(form_id=form.id, order_index=3, type="rating", label="Rate us out of 5 stars", is_required=True,
                     options_json=json.dumps({"min": 1, "max": 5}), validation_json="{}", logic_json="{}"),
            Question(form_id=form.id, order_index=4, type="checkboxes", label="Which features do you use most?", is_required=False,
                     options_json=json.dumps(["Dashboard", "Reports", "Integrations", "API", "Mobile App"]), validation_json="{}", logic_json="{}"),
            Question(form_id=form.id, order_index=5, type="linear_scale", label="How likely are you to recommend us?", is_required=True,
                     options_json=json.dumps({"min": 0, "max": 10, "min_label": "Not likely", "max_label": "Extremely likely"}), validation_json="{}", logic_json="{}"),
            Question(form_id=form.id, order_index=6, type="long_answer", label="Any additional comments?", is_required=False,
                     options_json="[]", validation_json=json.dumps({"max_length": 1000}), logic_json="{}"),
        ]
        for q in questions:
            db.add(q)

        await db.commit()
        print(f"Seeded: user={user.email} | form slug={form.uuid_slug}")
        print(f"Share URL: http://localhost:5173/f/{form.uuid_slug}")


asyncio.run(seed())
