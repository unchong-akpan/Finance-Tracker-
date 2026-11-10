# Finance Tracker AI service

Local, CPU-only transaction categorisation and unusual-spending detection.
**No third-party packages, GPU, API key, or network access are required.**

## What it does

- **Category suggestions** for new/edited transactions using keyword rules plus
  a small multinomial Naive Bayes model trained on seed examples and your
  existing labelled transactions.
- **Category review** for the transactions list: flags rows whose current
  category differs from the model's suggestion.
- **Unusual spending** detection using robust z-scores (median/MAD), with a
  global fallback when a category has too little history.
- **Duplicate detection** for the same description + amount within two days.

Everything is implemented with the Python standard library (`http.server`,
`json`, `math`, `statistics`).

## Run

```powershell
python server.py
```

Or from the project root:

```powershell
npm run ai
```

The service listens on <http://127.0.0.1:5055>. Keep it running while using the
Transactions page. The Node backend proxies requests through `/api/ai/*`.

If you prefer an isolated environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python server.py
```

No packages need to be installed inside the venv.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Service/model status |
| POST | `/categorize-one` | Suggest a category for one transaction |
| POST | `/categorize` | Categorise a batch and detect anomalies |

### `POST /categorize-one`

```json
{
  "type": "expense",
  "amount": 12.5,
  "description": "Starbucks coffee"
}
```

### `POST /categorize`

```json
{
  "transactions": [
    {
      "id": "abc",
      "type": "expense",
      "amount": 12.5,
      "description": "Starbucks coffee",
      "category": "Other",
      "date": "2026-10-01"
    }
  ]
}
```

## Tests

```powershell
python -m unittest -v test_categorizer.py
```

## Notes

- The model trains at request time; with a few hundred rows this is still fast
  on a laptop CPU.
- More corrected categories in the database = better suggestions.
- The AI only suggests; nothing is changed until you click **Apply**.
- Transaction descriptions are processed locally and never leave the machine.
- The Naive Bayes implementation lives in `categorizer.py`; keyword rules take
  priority for clear merchants (“Netflix”, “Uber”, “electricity bill”).
