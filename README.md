# Finance Tracker

A personal finance management app to track income, expenses, and budgets with visual charts.

## Features

- Dashboard with income/expense summary and balance
- Transaction management (add, filter, delete)
- Monthly budget tracking with color-coded progress bars
- Spending charts (bar + doughnut)
- Dark mode toggle
- Category filtering

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React + Tailwind CSS |
| Charts   | Chart.js |
| Backend  | Node.js + Express |
| Database | JSON file (data.json) |

## Getting Started

```bash
# Install dependencies
npm run install-all

# Start both servers
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Project Structure

```
finance-tracker/
├── backend/
│   ├── server.js
│   ├── models/database.js
│   └── routes/
│       ├── transactions.js
│       ├── budgets.js
│       └── stats.js
└── frontend/
    └── src/
        ├── App.jsx
        ├── api.js
        └── pages/
            ├── Dashboard.jsx
            ├── Transactions.jsx
            └── Budgets.jsx
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/transactions | List transactions |
| POST | /api/transactions | Create transaction |
| PUT | /api/transactions/:id | Update transaction |
| DELETE | /api/transactions/:id | Delete transaction |
| GET | /api/budgets | List budgets |
| POST | /api/budgets | Create/update budget |
| GET | /api/stats/summary | Income/expense summary |
| GET | /api/stats/by-category | Spending by category |
| GET | /api/stats/monthly | Monthly trends |
