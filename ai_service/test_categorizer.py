"""Tests for the local categoriser and anomaly detector.

Run:
    .venv\\Scripts\\python.exe -m unittest -v test_categorizer.py
"""

import unittest

from categorizer import analyze_transactions, suggest_category


def tx(description, category="Other", amount=20.0, tx_type="expense", day="2026-10-01"):
    return {
        "id": description.lower().replace(" ", "-"),
        "type": tx_type,
        "amount": amount,
        "description": description,
        "category": category,
        "date": day,
    }


class SuggestCategoryTests(unittest.TestCase):
    def test_food(self):
        result = suggest_category(
            {"type": "expense", "amount": 12, "description": "Starbucks coffee"}
        )
        self.assertEqual(result["suggested_category"], "Food & Dining")
        self.assertGreater(result["confidence"], 0.5)

    def test_transport(self):
        result = suggest_category(
            {"type": "expense", "amount": 8, "description": "Uber ride home"}
        )
        self.assertEqual(result["suggested_category"], "Transportation")

    def test_utilities_not_transport(self):
        result = suggest_category(
            {"type": "expense", "amount": 150, "description": "Gas bill"}
        )
        self.assertEqual(result["suggested_category"], "Utilities")

    def test_income(self):
        result = suggest_category(
            {"type": "income", "amount": 5000, "description": "Salary October"}
        )
        self.assertEqual(result["suggested_category"], "Income")

    def test_income_category_is_restricted(self):
        result = suggest_category(
            {"type": "income", "amount": 200, "description": "Amazon order"}
        )
        self.assertIn(result["suggested_category"], ["Income", "Savings", "Other"])

    def test_empty_description_falls_back(self):
        result = suggest_category({"type": "expense", "amount": 20, "description": ""})
        self.assertEqual(result["suggested_category"], "Other")

    def test_alternatives_are_present(self):
        result = suggest_category(
            {"type": "expense", "amount": 20, "description": "Netflix subscription"}
        )
        self.assertEqual(result["suggested_category"], "Entertainment")
        self.assertGreaterEqual(len(result["alternatives"]), 1)


class AnalyzeTests(unittest.TestCase):
    def test_detects_wrong_category_suggestion(self):
        result = analyze_transactions(
            [tx("Uber ride", category="Other", amount=15)]
        )
        item = result["results"][0]
        self.assertEqual(item["suggested_category"], "Transportation")
        self.assertTrue(item["differs"])
        self.assertGreaterEqual(result["summary"]["suggestions"], 1)

    def test_does_not_suggest_when_category_matches(self):
        result = analyze_transactions(
            [tx("Uber ride", category="Transportation", amount=15)]
        )
        item = result["results"][0]
        self.assertEqual(item["suggested_category"], "Transportation")
        self.assertFalse(item["differs"])

    def test_detects_unusual_spending(self):
        rows = [
            tx("Lunch", "Food & Dining", 12, day="2026-10-01"),
            tx("Lunch", "Food & Dining", 14, day="2026-10-02"),
            tx("Lunch", "Food & Dining", 11, day="2026-10-03"),
            tx("Lunch", "Food & Dining", 13, day="2026-10-04"),
            tx("Lunch", "Food & Dining", 12, day="2026-10-05"),
            tx("Lunch", "Food & Dining", 900, day="2026-10-06"),
            tx("Bus", "Transportation", 3, day="2026-10-01"),
            tx("Bus", "Transportation", 4, day="2026-10-02"),
            tx("Bus", "Transportation", 3, day="2026-10-03"),
            tx("Bus", "Transportation", 4, day="2026-10-04"),
        ]
        result = analyze_transactions(rows)
        outlier = next(
            item for item in result["results"] if item["amount"] == 900
        )
        self.assertTrue(outlier["is_anomaly"])
        self.assertIn("usual", outlier["anomaly_reason"])

    def test_detects_duplicate(self):
        rows = [
            tx("Grocery run", "Food & Dining", 80, day="2026-10-01"),
            tx("Grocery run", "Food & Dining", 80, day="2026-10-02"),
        ]
        result = analyze_transactions(rows)
        self.assertTrue(any(item["is_anomaly"] for item in result["results"]))

    def test_summary_shape(self):
        result = analyze_transactions([tx("Bus fare", "Transportation", 3)])
        self.assertIn("summary", result)
        self.assertEqual(result["summary"]["total"], 1)
        self.assertIn("categories", result)


if __name__ == "__main__":
    unittest.main()
