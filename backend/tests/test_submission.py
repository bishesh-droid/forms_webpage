import pytest


async def create_published_form(auth_client):
    cr = await auth_client.post("/api/forms", json={"title": "Survey"})
    form_id = cr.json()["id"]
    slug = cr.json()["uuid_slug"]

    await auth_client.post(f"/api/forms/{form_id}/questions", json={"type": "short_answer", "label": "Name", "is_required": True})
    await auth_client.post(f"/api/forms/{form_id}/questions", json={"type": "multiple_choice", "label": "Choice", "options": ["A", "B"]})
    await auth_client.post(f"/api/forms/{form_id}/publish")

    return form_id, slug


@pytest.mark.asyncio
async def test_public_form_fetch(client, auth_client):
    _, slug = await create_published_form(auth_client)
    resp = await client.get(f"/api/public/forms/{slug}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["questions"]) == 2


@pytest.mark.asyncio
async def test_submit_form(client, auth_client):
    form_id, slug = await create_published_form(auth_client)
    form_data = await client.get(f"/api/public/forms/{slug}")
    questions = form_data.json()["questions"]
    q1_id = questions[0]["id"]
    q2_id = questions[1]["id"]

    resp = await client.post(f"/api/public/forms/{slug}/submit", json={
        "answers": [
            {"question_id": q1_id, "value_text": "Alice"},
            {"question_id": q2_id, "value_text": "A"},
        ]
    })
    assert resp.status_code == 201
    assert "response_id" in resp.json()


@pytest.mark.asyncio
async def test_unpublished_form_not_accessible(client, auth_client):
    cr = await auth_client.post("/api/forms", json={"title": "Private"})
    slug = cr.json()["uuid_slug"]
    resp = await client.get(f"/api/public/forms/{slug}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_view_responses(auth_client):
    form_id, slug = await create_published_form(auth_client)
    form_data = await auth_client.get(f"/api/public/forms/{slug}")
    q1_id = form_data.json()["questions"][0]["id"]

    await auth_client.post(f"/api/public/forms/{slug}/submit", json={"answers": [{"question_id": q1_id, "value_text": "Bob"}]})
    resp = await auth_client.get(f"/api/forms/{form_id}/responses")
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1
