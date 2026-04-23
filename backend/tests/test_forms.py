import pytest


@pytest.mark.asyncio
async def test_create_form(auth_client):
    resp = await auth_client.post("/api/forms", json={"title": "My Form", "description": "Test"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "My Form"
    assert data["is_published"] is False


@pytest.mark.asyncio
async def test_list_forms(auth_client):
    await auth_client.post("/api/forms", json={"title": "F1"})
    await auth_client.post("/api/forms", json={"title": "F2"})
    resp = await auth_client.get("/api/forms")
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


@pytest.mark.asyncio
async def test_get_form(auth_client):
    cr = await auth_client.post("/api/forms", json={"title": "GetMe"})
    form_id = cr.json()["id"]
    resp = await auth_client.get(f"/api/forms/{form_id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "GetMe"


@pytest.mark.asyncio
async def test_update_form(auth_client):
    cr = await auth_client.post("/api/forms", json={"title": "Old Title"})
    form_id = cr.json()["id"]
    resp = await auth_client.patch(f"/api/forms/{form_id}", json={"title": "New Title"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"


@pytest.mark.asyncio
async def test_publish_toggle(auth_client):
    cr = await auth_client.post("/api/forms", json={"title": "Publish Me"})
    form_id = cr.json()["id"]
    resp = await auth_client.post(f"/api/forms/{form_id}/publish")
    assert resp.status_code == 200
    assert resp.json()["is_published"] is True
    resp2 = await auth_client.post(f"/api/forms/{form_id}/publish")
    assert resp2.json()["is_published"] is False


@pytest.mark.asyncio
async def test_duplicate_form(auth_client):
    cr = await auth_client.post("/api/forms", json={"title": "Original"})
    form_id = cr.json()["id"]
    await auth_client.post(f"/api/forms/{form_id}/questions", json={"type": "short_answer", "label": "Name?"})
    resp = await auth_client.post(f"/api/forms/{form_id}/duplicate")
    assert resp.status_code == 201
    assert "Copy of" in resp.json()["title"]


@pytest.mark.asyncio
async def test_delete_form(auth_client):
    cr = await auth_client.post("/api/forms", json={"title": "Delete Me"})
    form_id = cr.json()["id"]
    resp = await auth_client.delete(f"/api/forms/{form_id}")
    assert resp.status_code == 204
    resp2 = await auth_client.get(f"/api/forms/{form_id}")
    assert resp2.status_code == 404
