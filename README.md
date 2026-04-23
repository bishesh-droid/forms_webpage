# Google Forms Clone

A full-stack Google Forms clone — create forms, share public links, collect responses, and view analytics.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI 0.111, SQLAlchemy 2.0 (async), SQLite, Alembic |
| Auth | JWT (access + refresh tokens), bcrypt |
| Frontend | React 18, Vite, TypeScript, TailwindCSS, shadcn/ui |
| State | TanStack Query v5 + Zustand |
| Validation | Pydantic v2 (backend), Zod + React Hook Form (frontend) |
| Charts | Recharts |
| Drag & Drop | @dnd-kit/sortable |
| Rate limiting | slowapi |

---

## Features

### Form Builder
- 15+ question types: short answer, long answer, multiple choice, checkboxes, dropdown, linear scale, rating, number, email, phone, URL, date, time, section headers, page breaks
- Drag-and-drop question reordering
- Split-pane live preview
- Autosave every 3 seconds
- Per-question required/optional toggle
- One-click question duplication
- Publish / unpublish toggle with shareable slug

### Respondent Side
- Mobile-responsive fill UI
- Multi-page forms with progress bar
- Real-time client-side validation
- Debounced submit (prevents double-submission)
- Submission confirmation screen

### Responses & Analytics
- Paginated response table
- Per-question charts (bar, histogram, text preview)
- Export as CSV (UTF-8 BOM), JSON, or XLSX
- Delete individual responses

### Security
- JWT access tokens (15 min) + refresh tokens (7 days) stored in httpOnly cookies
- bcrypt password hashing (rounds=12)
- Rate limiting on public submit endpoint (10 req/min per IP)
- CORS origin whitelist
- HTML sanitization on text inputs (bleach)
- Minimum 12-character password policy
- All secrets via `.env` (pydantic-settings)

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Python | 3.11 |
| Node.js | 18 |
| npm | 9 |

---

## Local Setup

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Open .env and set a strong SECRET_KEY (32+ random chars)

# Run database migrations
alembic upgrade head

# Start the development server
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

The frontend proxies API calls to `http://localhost:8000` by default.
To point at a different backend, set `VITE_API_URL` before running:

```bash
VITE_API_URL=http://my-server:8000 npm run dev
```

### 3. Seed demo data (optional)

```bash
cd backend
python seed.py
# Creates demo@example.com / DemoPassword123!
```

---

## Environment Variables

All backend config lives in `backend/.env`. Copy `.env.example` to get started.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./forms.db` | SQLAlchemy async DB URL |
| `SECRET_KEY` | *(must change)* | JWT signing key — use a random 32+ char string |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Short-lived access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token TTL |
| `BCRYPT_ROUNDS` | `12` | bcrypt work factor |
| `UPLOAD_DIR` | `./uploads` | Directory for file uploads |
| `MAX_UPLOAD_SIZE_MB` | `10` | Max upload size |
| `ALLOWED_ORIGINS` | `http://localhost:5173,...` | Comma-separated CORS origins |
| `ENVIRONMENT` | `development` | `development` or `production` |

Generate a secure key:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Docker Compose

Runs both services with a single command. No local Python or Node install needed.

```bash
# Copy and edit env (set SECRET_KEY at minimum)
cp backend/.env.example backend/.env

docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API docs | http://localhost:8000/docs |

Data is persisted via Docker volumes (`forms.db` and `uploads/`).

---

## Database Migrations (Alembic)

```bash
cd backend

# Apply all pending migrations
alembic upgrade head

# Create a new migration after editing models
alembic revision --autogenerate -m "describe your change"

# Roll back one step
alembic downgrade -1
```

---

## Running Tests

```bash
cd backend
source venv/bin/activate
pytest -v
```

Test files:

| File | Coverage |
|------|----------|
| `tests/test_auth.py` | Registration, login, token refresh, logout |
| `tests/test_forms.py` | CRUD, publish/unpublish, duplicate |
| `tests/test_submission.py` | Public form fill & submission |
| `tests/test_export.py` | CSV, JSON, XLSX export |

---

## API Reference

Full interactive docs at **http://localhost:8000/docs** (Swagger UI) or **/redoc**.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | — | Register new user |
| POST | `/api/v1/auth/login` | — | Login, sets httpOnly cookies |
| POST | `/api/v1/auth/refresh` | cookie | Refresh access token |
| POST | `/api/v1/auth/logout` | cookie | Clear auth cookies |
| GET | `/api/v1/auth/me` | Bearer | Current user info |

### Forms

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/forms` | List my forms (paginated) |
| POST | `/api/v1/forms` | Create form |
| GET | `/api/v1/forms/{id}` | Get form + questions |
| PATCH | `/api/v1/forms/{id}` | Update title/description/settings |
| DELETE | `/api/v1/forms/{id}` | Delete form |
| POST | `/api/v1/forms/{id}/duplicate` | Duplicate form |
| POST | `/api/v1/forms/{id}/publish` | Toggle publish (returns shareable slug) |

### Questions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/forms/{id}/questions` | Add question |
| PATCH | `/api/v1/questions/{id}` | Update question |
| DELETE | `/api/v1/questions/{id}` | Delete question |
| POST | `/api/v1/forms/{id}/questions/reorder` | Reorder (send ordered ID list) |

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/public/forms/{slug}` | Get published form |
| POST | `/api/v1/public/forms/{slug}/submit` | Submit a response (rate-limited 10/min) |

### Responses

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/forms/{id}/responses` | Paginated response list |
| GET | `/api/v1/responses/{id}` | Single response detail |
| DELETE | `/api/v1/responses/{id}` | Delete response |
| GET | `/api/v1/forms/{id}/export?format=csv\|json\|xlsx` | Export all responses |
| GET | `/api/v1/forms/{id}/analytics` | Aggregated analytics data |

---

## Project Structure

```
google_forms/
├── backend/
│   ├── app/
│   │   ├── api/v1/          — auth.py, forms.py, questions.py, public.py, responses.py
│   │   ├── core/            — config.py, security.py, dependencies.py
│   │   ├── db/              — session.py, base.py
│   │   ├── models/          — user.py, form.py, question.py, response.py
│   │   ├── schemas/         — Pydantic v2 request/response schemas
│   │   └── utils/           — csv_export.py, xlsx_export.py
│   ├── alembic/             — migration scripts
│   ├── tests/               — pytest async test suite
│   ├── seed.py              — demo data seeder
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      — ui/, builder/, respondent/, analytics/
│   │   ├── hooks/           — useAuth, useForms, useQuestions, useToast
│   │   ├── pages/           — LoginPage, RegisterPage, DashboardPage,
│   │   │                      BuilderPage, FormFillPage, ResponsesPage
│   │   ├── stores/          — authStore (Zustand), builderStore (Zustand)
│   │   ├── lib/             — api.ts (axios client)
│   │   └── types/           — shared TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
└── LICENSE
```

---

## License

[MIT](LICENSE)
