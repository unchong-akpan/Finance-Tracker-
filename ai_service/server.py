"""Zero-dependency HTTP server for the local finance AI service.

Run:
    python server.py

Endpoints:
    GET  /health
    POST /categorize-one
    POST /categorize

No FastAPI, Flask, scikit-learn, GPU, or network access is required. The
categoriser uses keyword rules plus a small multinomial Naive Bayes model
implemented in categorizer.py.
"""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from categorizer import (
    ALL_CATEGORIES,
    analyze_transactions,
    suggest_category,
)

HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "5055"))
MAX_BODY_BYTES = 1_000_000
ALLOWED_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
}


class AiHandler(BaseHTTPRequestHandler):
    server_version = "FinanceTrackerAI/1.0"

    def log_message(self, format_string, *args):  # noqa: A002 - stdlib signature
        print(f"{self.address_string()} - {format_string % args}")

    def _cors_headers(self) -> None:
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length_header = self.headers.get("Content-Length", "0")
        try:
            length = int(length_header)
        except ValueError:
            raise ValueError("Invalid Content-Length")
        if length <= 0:
            return {}
        if length > MAX_BODY_BYTES:
            raise ValueError("Request body is too large")
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSON: {error.msg}")
        if not isinstance(payload, dict):
            raise ValueError("Request body must be a JSON object")
        return payload

    def do_OPTIONS(self) -> None:  # noqa: N802 - stdlib signature
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802 - stdlib signature
        if self.path == "/health":
            self._send_json(
                200,
                {
                    "status": "ok",
                    "service": "finance-tracker-ai",
                    "model": "naive-bayes+keyword-rules",
                    "runtime": "python-stdlib",
                    "categories": ALL_CATEGORIES,
                },
            )
            return
        if self.path == "/":
            self._send_json(
                200,
                {
                    "service": "finance-tracker-ai",
                    "endpoints": ["/health", "/categorize-one", "/categorize"],
                },
            )
            return
        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:  # noqa: N802 - stdlib signature
        try:
            payload = self._read_json()

            if self.path == "/categorize-one":
                if "type" in payload and payload["type"] not in ("income", "expense"):
                    raise ValueError("type must be income or expense")
                self._send_json(200, suggest_category(payload))
                return

            if self.path == "/categorize":
                transactions = payload.get("transactions")
                if not isinstance(transactions, list) or not transactions:
                    raise ValueError("transactions must be a non-empty array")
                if len(transactions) > 500:
                    raise ValueError("Maximum 500 transactions per request")
                for index, transaction in enumerate(transactions):
                    if not isinstance(transaction, dict):
                        raise ValueError(f"transactions[{index}] must be an object")
                self._send_json(200, analyze_transactions(transactions))
                return

            self._send_json(404, {"error": "Not found"})
        except ValueError as error:
            self._send_json(400, {"error": str(error)})
        except Exception as error:  # pragma: no cover - defensive boundary
            print(f"AI server error: {error}")
            self._send_json(500, {"error": "AI request failed"})


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), AiHandler)
    server.daemon_threads = True
    print(f"Finance AI service running at http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping AI service.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
