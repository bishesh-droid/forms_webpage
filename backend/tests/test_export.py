import pytest


async def setup_form_with_responses(auth_client, client):
    cr = await auth_client.post("/api/forms", json={"title": "Export Test"})
    form_id = cr.json()["id"]
    slug = cr.json()["uuid_slug"]

    await auth_client.post(f"/api/forms/{form_id}/questions", json={"type": "short_answer", "label": "Name"})
    await auth_client.post(f"/api/forms/{form_id}/publish")

    form_data = await client.get(f"/api/public/forms/{slug}")
    q_id = form_data.json()["questions"][0]["id"]

    for name in ["Alice", "Bob", "Charlie"]:
        await client.post(f"/api/public/forms/{slug}/submit", json={"answers": [{"question_id": q_id, "value_text": name}]})

    return form_id


@pytest.mark.asyncio
async def test_csv_export(auth_client, client):
    form_id = await setup_form_with_responses(auth_client, client)
    resp = await auth_client.get(f"/api/forms/{form_id}/export?format=csv")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    body = resp.content.decode("utf-8-sig")
    assert "Name" in body
    assert "Alice" in body


@pytest.mark.asyncio
async def test_json_export(auth_client, client):
    form_id = await setup_form_with_responses(auth_client, client)
    resp = await auth_client.get(f"/api/forms/{form_id}/export?format=json")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 3


@pytest.mark.asyncio
async def test_xlsx_export(auth_client, client):
    form_id = await setup_form_with_responses(auth_client, client)
    resp = await auth_client.get(f"/api/forms/{form_id}/export?format=xlsx")
    assert resp.status_code == 200
    assert "spreadsheetml" in resp.headers["content-type"]


@pytest.mark.asyncio
async def test_analytics(auth_client, client):
    form_id = await setup_form_with_responses(auth_client, client)
    resp = await auth_client.get(f"/api/forms/{form_id}/analytics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_responses"] == 3
    assert len(data["questions"]) >= 1
