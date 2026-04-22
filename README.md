# Google Forms Clone

A full-stack Google Forms clone built with FastAPI + React.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy 2.0 (async), SQLite, Alembic |
| Auth | JWT (access + refresh), bcrypt |
| Frontend | React 18, Vite, TailwindCSS, shadcn/ui |
| State | TanStack Query + Zustand |
| Validation | Pydantic v2 (backend), Zod + React Hook Form (frontend) |
| Charts | Recharts |
| DnD | @dnd-kit/sortable |
| Rate limiting | slowapi |

---

## Quick Start (Local)

### Prerequisites
- Python 3.11+
- Node 18+

### Backend

```bash
cd backend

# Create virtualenv
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install deps
pip install -r requirements.txt

# Copy env
cp .env.example .env
# Edit .env and set SECRET_KEY

# Start server
uvicorn app.main:app --reload --port 8000
```

API docs available at http://localhost:8000/docs

### Seed demo data (optional)
```bash
cd backend
python seed.py
# Creates demo@example.com / DemoPassword123!
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## Docker Compose

```bash
cp .env.example .env
# Edit SECRET_KEY in .env

docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/docs

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest -v
```

---

## Features

### Form Builder
- 15+ question types (short answer, long answer, multiple choice, checkboxes, dropdown, linear scale, rating, number, email, phone, URL, date, time, section headers, page breaks)
- Drag-and-drop reordering with @dnd-kit
- Live preview pane
- Autosave every 3 seconds
- Conditional required/optional per question
- Question duplication

### Respondent Side
- Clean mobile-responsive UI
- Multi-page forms with progress bar
- Real-time client-side validation
- Submission confirmation screen
- Debounced submit to prevent double-submission

### Responses & Analytics
- Paginated response table
- Per-question charts (bar, histogram, text preview)
- Export as CSV (UTF-8 BOM), JSON, or XLSX
- Delete individual responses

### Security
- JWT access (15min) + refresh (7d) tokens, httpOnly cookies
- bcrypt password hashing (rounds=12)
- Rate limiting on public submit endpoint (10/min per IP)
- CORS whitelist
- HTML sanitization on text inputs (bleach)
- Password min 12 chars policy
- Secrets via .env (pydantic-settings)

---

## API Reference

Full interactive docs: http://localhost:8000/docs

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |

### Forms (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/forms | List my forms |
| POST | /api/forms | Create form |
| GET | /api/forms/{id} | Get form with questions |
| PATCH | /api/forms/{id} | Update form |
| DELETE | /api/forms/{id} | Delete form |
| POST | /api/forms/{id}/duplicate | Duplicate form |
| POST | /api/forms/{id}/publish | Toggle publish |

### Questions (auth required)
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/forms/{id}/questions | Add question |
| PATCH | /api/questions/{id} | Update question |
| DELETE | /api/questions/{id} | Delete question |
| POST | /api/forms/{id}/questions/reorder | Reorder |

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/public/forms/{slug} | Get published form |
| POST | /api/public/forms/{slug}/submit | Submit response |

### Responses (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/forms/{id}/responses | Paginated responses |
| GET | /api/responses/{id} | Single response |
| DELETE | /api/responses/{id} | Delete response |
| GET | /api/forms/{id}/export?format=csv\|json\|xlsx | Export |
| GET | /api/forms/{id}/analytics | Analytics data |

---

## Project Structure

```
forms-clone/
├── backend/
│   ├── app/
│   │   ├── api/v1/       — auth, forms, questions, public, responses
│   │   ├── core/         — config, security, dependencies
│   │   ├── db/           — session, base
│   │   ├── models/       — User, Form, Question, Response, Answer
│   │   ├── schemas/      — Pydantic schemas
│   │   └── utils/        — csv_export, xlsx_export
│   ├── tests/            — pytest test suite
│   ├── seed.py           — demo data seeder
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   — ui/, builder/, respondent/, analytics/
│   │   ├── hooks/        — useAuth, useForms, useQuestions, useToast
│   │   ├── pages/        — Login, Register, Dashboard, Builder, Fill, Responses
│   │   ├── stores/       — authStore, builderStore
│   │   └── types/
│   └── package.json
└── docker-compose.yml
```
