# Finance Tracker

A personal finance management app to track income, expenses, and budgets, with
a local AI assistant for category suggestions and unusual-spending detection.

> This is a personal finance tracker. It does **not** hold, receive, or move
> real money.

## Features

- Dashboard with income/expense summary and balance
- Transaction management (add, filter, edit, delete, CSV import/export)
- AI category suggestions while adding/editing a transaction
- AI review of transaction categories
- Unusual-spending and duplicate detection
- Monthly budget tracking with color-coded progress bars
- Spending charts (bar + doughnut)
- Dark mode toggle
- JWT authentication (when users are registered)
- Local SQLite storage (WAL mode)
- Lightweight Node + Python architecture, no paid AI API

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, Chart.js, TanStack Query |
| Backend | Node.js, Express, `node:sqlite` |
| AI service | Python 3 standard library (keyword rules + Naive Bayes) |
| Database | SQLite (`backend/finance.db`) |

## Getting started

### 1. Install JavaScript dependencies

```powershell
npm run install-all
```

### 2. Run everything

```powershell
npm run dev:all
```

That starts:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- AI service: http://127.0.0.1:5055

The AI service has **no Python dependencies** — `python server.py` is enough.

Or run pieces separately:

```powershell
npm run server   # backend only
npm run client   # frontend only
npm run ai       # AI service only
npm run dev      # backend + frontend, no AI
```

### Docker

```powershell
docker compose up --build
```

The compose file starts both the app (port 5000) and the AI service (port 5055).
The app connects to the AI service over the internal Docker network.

## AI features

### Suggest a category

Open **Add Transaction**, type a description (e.g. “Uber ride”), and click
**AI suggest**. The category is filled from a keyword + ML model, and the
confidence is shown. Nothing is saved until you submit the form.

### Review transaction categories

On the **Transactions** page, click **AI Review**. The panel shows:

- transactions whose category differs from the AI suggestion
- unusual spending based on robust per-category statistics
- possible duplicates

Review the suggestions, then click **Apply N suggestions**. The backend
validates each category against the transaction type before updating.

### How it works

- Keyword rules handle clear merchants (“Netflix”, “Uber”, “electricity bill”).
- A small multinomial Naive Bayes model learns from seed examples plus your own
  labelled transactions.
- Anomaly detection uses median absolute deviation, falling back to a global
  baseline when a category has too little history.
- Everything runs locally; transaction text is not sent to a third-party AI
  provider.

More details: [`ai_service/README.md`](ai_service/README.md).

## Project structure

```text
finance-tracker/
├── backend/
│   ├── server.js
│   ├── models/database.js
│   ├── lib/categories.js
│   └── routes/
│       ├── transactions.js
│       ├── budgets.js
│       ├── stats.js
│       ├── recurring.js
│       ├── auth.js
│       └── ai.js
├── frontend/
│   └── src/
│       ├── api.js
│       ├── pages/
│       │   └── Transactions.jsx
│       ├── hooks/
│       │   └── useAi.js
│       └── components/transactions/
│           ├── AiInsights.jsx
│           ├── TransactionForm.jsx
│           └── TransactionTable.jsx
└── ai_service/
    ├── server.py
    ├── categorizer.py
    ├── seed_data.py
    ├── test_categorizer.py
    └── README.md
```

## API endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET | `/api/transactions` | List transactions |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| POST | `/api/transactions/import` | Bulk CSV import |
| GET | `/api/budgets` | List budgets |
| POST | `/api/budgets` | Create/update budget |
| GET | `/api/stats/summary` | Income/expense summary |
| GET | `/api/stats/by-category` | Spending by category |
| GET | `/api/stats/monthly` | Monthly trends |
| GET | `/api/ai/status` | AI service status |
| POST | `/api/ai/suggest` | Suggest a category for one transaction |
| POST | `/api/ai/analyze` | Batch categorisation + anomaly detection |
| POST | `/api/ai/apply` | Apply accepted category suggestions |

## Environment

Backend (`backend/.env`, copy from `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | Backend port |
| `HOST` | `127.0.0.1` | Bind address |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin |
| `API_TOKEN` | empty | Optional shared API token |
| `AI_SERVICE_URL` | `http://127.0.0.1:5055` | Python AI service |
| `JWT_SECRET` | generated/dev value | Auth token signing |

## Tests

```powershell
# Backend API tests
cd backend
npm test

# Frontend lint + production build
cd ../frontend
npm run lint
npm run build

# AI service tests
cd ../ai_service
python -m unittest -v test_categorizer.py
```

## Notes and limitations

- The AI is intentionally a small local model. It improves as you correct
  categories, but it is not a financial adviser.
- The app is single-user by default; transactions are not scoped per user even
  though authentication is supported. Add `user_id` columns before using it
  for multiple people.
- No real money movement or wallet functionality is included.
