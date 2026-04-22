import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    resp = await client.post("/api/auth/register", json={"email": "new@test.com", "password": "StrongPass123!", "name": "New User"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@test.com"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"email": "dup@test.com", "password": "StrongPass123!", "name": "User"}
    await client.post("/api/auth/register", json=payload)
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_register_weak_password(client):
    resp = await client.post("/api/auth/register", json={"email": "x@test.com", "password": "short", "name": "X"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post("/api/auth/register", json={"email": "login@test.com", "password": "StrongPass123!", "name": "L"})
    resp = await client.post("/api/auth/login", json={"email": "login@test.com", "password": "StrongPass123!"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json={"email": "x@test.com", "password": "StrongPass123!", "name": "X"})
    resp = await client.post("/api/auth/login", json={"email": "x@test.com", "password": "WrongPassword!"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(auth_client):
    resp = await auth_client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@test.com"
