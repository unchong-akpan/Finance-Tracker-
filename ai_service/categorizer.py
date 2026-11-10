"""Hybrid transaction categoriser and anomaly detector.

The first version intentionally uses small, fast, CPU-friendly models:

* hand-written keyword rules for high-precision, explainable matches
* TF-IDF + logistic regression trained on seed examples plus the user's own
  labelled transactions
* robust z-scores / MAD for unusual-spending detection
* a duplicate scan based on description + amount + nearby date

No GPU, external API, or paid service is required.
"""

from __future__ import annotations

import math
import re
import statistics
from collections import Counter, defaultdict
from datetime import date
from typing import Any, Iterable

from seed_data import SEED_DATA

EXPENSE_CATEGORIES = [
    "Food & Dining",
    "Transportation",
    "Housing",
    "Utilities",
    "Entertainment",
    "Shopping",
    "Healthcare",
    "Education",
    "Savings",
    "Other",
]

INCOME_CATEGORIES = ["Income", "Savings", "Other"]

ALL_CATEGORIES = list(dict.fromkeys(EXPENSE_CATEGORIES + INCOME_CATEGORIES))

CATEGORY_ALIASES = {
    "food": "Food & Dining",
    "food and dining": "Food & Dining",
    "dining": "Food & Dining",
    "restaurant": "Food & Dining",
    "groceries": "Food & Dining",
    "transport": "Transportation",
    "transportation": "Transportation",
    "travel": "Transportation",
    "bills": "Utilities",
    "utilities": "Utilities",
    "housing": "Housing",
    "rent": "Housing",
    "entertainment": "Entertainment",
    "shopping": "Shopping",
    "health": "Healthcare",
    "healthcare": "Healthcare",
    "education": "Education",
    "school": "Education",
    "savings": "Savings",
    "income": "Income",
    "salary": "Income",
    "other": "Other",
}


def normalize_category(value: Any) -> str:
    """Map a category string to one of the canonical categories."""
    if value is None:
        return "Other"
    text = str(value).strip()
    if not text:
        return "Other"
    for category in ALL_CATEGORIES:
        if text.lower() == category.lower():
            return category
    return CATEGORY_ALIASES.get(text.lower(), "Other")


# Rules are checked in this order. Utilities comes before Transportation so
# "gas bill" is a utility while plain "gas" is transport.
RULES: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(
            r"\b(gas bill|electric(?:ity)?|water bill|internet|wifi|broadband|"
            r"phone bill|airtime|mtn|airtel|glo|cable|dstv|trash|utility|"
            r"generator|data bundle)\b",
            re.IGNORECASE,
        ),
        "Utilities",
    ),
    (
        re.compile(
            r"\b(uber eats|doordash|grubhub|restaurant|mcdonald|starbucks|coffee|"
            r"grocer(?:y|ies)|supermarket|pizza|burger|kfc|bakery|cafe|food|"
            r"eatery|market|jollof)\b",
            re.IGNORECASE,
        ),
        "Food & Dining",
    ),
    (
        re.compile(
            r"\b(uber|lyft|bolt|taxi|bus|train|fuel|petrol|diesel|gas|shell|"
            r"chevron|parking|toll|car wash|mechanic|auto repair|vehicle service|"
            r"flight|airline|airfare)\b",
            re.IGNORECASE,
        ),
        "Transportation",
    ),
    (
        re.compile(
            r"\b(rent|landlord|mortgage|apartment|housing|property|estate|"
            r"moving expenses|home repair)\b",
            re.IGNORECASE,
        ),
        "Housing",
    ),
    (
        re.compile(
            r"\b(netflix|spotify|youtube premium|cinema|movie|concert|game|"
            r"playstation|steam|bar|club|bowling|museum|amazon prime video)\b",
            re.IGNORECASE,
        ),
        "Entertainment",
    ),
    (
        re.compile(
            r"\b(amazon|walmart|target|clothing|shoes|electronics|jumia|konga|"
            r"furniture|decor|gift|mall|shop|household items|office supplies)\b",
            re.IGNORECASE,
        ),
        "Shopping",
    ),
    (
        re.compile(
            r"\b(pharmacy|doctor|hospital|clinic|medicine|medical|dentist|"
            r"health|lab test|eye test|therapy|vitamins|supplements|gym|"
            r"fitness|workout|wellness)\b",
            re.IGNORECASE,
        ),
        "Healthcare",
    ),
    (
        re.compile(
            r"\b(tuition|school|university|course|udemy|coursera|book|"
            r"stationery|exam|training|workshop)\b",
            re.IGNORECASE,
        ),
        "Education",
    ),
    (
        re.compile(
            r"\b(savings?|invest(?:ment)?|mutual fund|emergency fund|"
            r"fixed deposit|stock|crypto|retirement|piggy bank)\b",
            re.IGNORECASE,
        ),
        "Savings",
    ),
    (
        re.compile(
            r"\b(salary|payroll|freelance|invoice|client payment|refund|"
            r"interest|dividend|bonus|commission|allowance|side hustle)\b",
            re.IGNORECASE,
        ),
        "Income",
    ),
    (
        re.compile(
            r"\b(cash withdrawal|bank charge|service fee|transfer|donation|"
            r"miscellaneous|unknown)\b",
            re.IGNORECASE,
        ),
        "Other",
    ),
]


def _allowed_categories(tx_type: str) -> list[str]:
    return INCOME_CATEGORIES if tx_type == "income" else EXPENSE_CATEGORIES


def _as_text(transaction: dict[str, Any]) -> str:
    tx_type = "income" if transaction.get("type") == "income" else "expense"
    description = str(transaction.get("description") or "").strip()
    return f"{tx_type} {description}"


def _normalise_transaction(transaction: dict[str, Any]) -> dict[str, Any]:
    amount = transaction.get("amount", 0)
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        amount = 0.0

    return {
        "id": str(transaction.get("id") or ""),
        "type": "income" if transaction.get("type") == "income" else "expense",
        "amount": amount,
        "description": str(transaction.get("description") or "").strip(),
        "category": normalize_category(transaction.get("category")),
        "date": str(transaction.get("date") or ""),
    }


def _training_rows(transactions: Iterable[dict[str, Any]]) -> tuple[list[str], list[str], int]:
    texts: list[str] = []
    labels: list[str] = []
    seen: set[tuple[str, str, str]] = set()

    for description, category in SEED_DATA:
        tx_type = "income" if category == "Income" else "expense"
        key = (description.lower(), category, tx_type)
        if key in seen:
            continue
        seen.add(key)
        texts.append(f"{tx_type} {description}")
        labels.append(category)

    seed_count = len(texts)

    for transaction in transactions:
        clean = _normalise_transaction(transaction)
        if not clean["description"]:
            continue
        if clean["category"] not in _allowed_categories(clean["type"]):
            continue
        key = (clean["description"].lower(), clean["category"], clean["type"])
        if key in seen:
            continue
        seen.add(key)
        texts.append(_as_text(clean))
        labels.append(clean["category"])

    return texts, labels, seed_count


class NaiveBayesModel:
    """Small multinomial Naive Bayes classifier using only the stdlib.

    This keeps the AI service installable on any machine without a 60 MB
    scikit-learn download. It uses word unigrams + bigrams and Laplace
    smoothing, which is more than enough for short transaction descriptions.
    """

    def __init__(self, texts: list[str], labels: list[str]):
        self.classes_ = sorted(set(labels))
        self.vocab: set[str] = set()
        self.class_token_counts = {category: Counter() for category in self.classes_}
        self.class_token_totals = {category: 0 for category in self.classes_}
        self.class_doc_counts = Counter(labels)
        self.total_docs = len(labels)

        for text, label in zip(texts, labels):
            for token in _tokenize(text):
                self.class_token_counts[label][token] += 1
                self.class_token_totals[label] += 1
                self.vocab.add(token)

    def predict_proba(self, texts: list[str]) -> list[list[float]]:
        vocab_size = max(1, len(self.vocab))
        class_count = max(1, len(self.classes_))
        rows: list[list[float]] = []

        for text in texts:
            tokens = _tokenize(text)
            log_scores: dict[str, float] = {}

            for category in self.classes_:
                prior = (self.class_doc_counts[category] + 1) / (
                    self.total_docs + class_count
                )
                score = math.log(prior)
                denominator = self.class_token_totals[category] + vocab_size
                counts = self.class_token_counts[category]
                for token in tokens:
                    score += math.log((counts[token] + 1) / denominator)
                log_scores[category] = score

            maximum = max(log_scores.values())
            exponentials = {
                category: math.exp(value - maximum)
                for category, value in log_scores.items()
            }
            total = sum(exponentials.values()) or 1.0
            rows.append(
                [exponentials[category] / total for category in self.classes_]
            )

        return rows


def _tokenize(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9']+", text.lower())
    tokens = list(words)
    tokens.extend(
        f"{words[index]} {words[index + 1]}" for index in range(len(words) - 1)
    )
    return tokens


def _build_model(
    transactions: Iterable[dict[str, Any]],
) -> tuple[NaiveBayesModel | None, int, int]:
    texts, labels, seed_count = _training_rows(transactions)
    if len(texts) < 8 or len(set(labels)) < 2:
        return None, seed_count, len(texts)

    model = NaiveBayesModel(texts, labels)
    return model, seed_count, len(texts)


def _rule_match(description: str, allowed: list[str]) -> tuple[str, float] | None:
    for pattern, category in RULES:
        if category in allowed and pattern.search(description):
            return category, 0.94
    return None


def _default_category(tx_type: str) -> tuple[str, float]:
    if tx_type == "income":
        return "Income", 0.35
    return "Other", 0.30


def _predict_one(
    transaction: dict[str, Any],
    model: Pipeline | None,
) -> tuple[str, float, str, list[dict[str, Any]]]:
    clean = _normalise_transaction(transaction)
    allowed = _allowed_categories(clean["type"])
    description = clean["description"]

    probabilities: dict[str, float] = {}
    if model is not None and description:
        raw = model.predict_proba([_as_text(clean)])[0]
        probabilities = {
            str(label): float(probability)
            for label, probability in zip(model.classes_, raw)
            if str(label) in allowed
        }

    rule = _rule_match(description, allowed) if description else None

    if rule is not None:
        category, confidence = rule
        probabilities[category] = max(probabilities.get(category, 0.0), confidence)
        source = "rule"
    elif probabilities:
        category = max(probabilities, key=probabilities.get)
        confidence = float(probabilities[category])
        source = "model"
    else:
        category, confidence = _default_category(clean["type"])
        source = "fallback"

    alternatives = sorted(
        (
            {"category": label, "confidence": round(score, 4)}
            for label, score in probabilities.items()
        ),
        key=lambda item: item["confidence"],
        reverse=True,
    )[:3]

    if not any(item["category"] == category for item in alternatives):
        alternatives.insert(
            0, {"category": category, "confidence": round(confidence, 4)}
        )
        alternatives = alternatives[:3]

    return category, round(confidence, 4), source, alternatives


def suggest_category(transaction: dict[str, Any]) -> dict[str, Any]:
    """Categorise a single transaction for the add/edit form."""
    model, seed_count, total_count = _build_model([])
    category, confidence, source, alternatives = _predict_one(transaction, model)
    return {
        "suggested_category": category,
        "confidence": confidence,
        "source": source,
        "alternatives": alternatives,
        "trained_examples": total_count,
        "seed_examples": seed_count,
    }


def _parse_date(value: str) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _median_absolute_deviation(values: list[float], median: float) -> float:
    if not values:
        return 0.0
    return statistics.median(abs(value - median) for value in values)


def detect_anomalies(transactions: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Return anomaly details keyed by transaction id.

    Category-level statistics are used when there are at least four expenses in
    a category; otherwise a global baseline is used, but only if there are at
    least eight expenses overall. This avoids noisy flags for brand-new data.
    """
    expenses = [
        item
        for item in transactions
        if item["type"] == "expense" and item["amount"] > 0
    ]
    anomalies: dict[str, dict[str, Any]] = {}

    # Duplicate detection: the same description + amount within two days.
    # This is useful even for a very small transaction history.
    ordered = sorted(
        (item for item in expenses if item["description"]),
        key=lambda item: item["date"] or "",
    )
    previous: dict[tuple[str, float], dict[str, Any]] = {}
    for item in ordered:
        key = (item["description"].lower(), round(item["amount"], 2))
        earlier = previous.get(key)
        if earlier is not None:
            first_date = _parse_date(earlier["date"])
            second_date = _parse_date(item["date"])
            if first_date and second_date:
                gap = abs((second_date - first_date).days)
                if gap <= 2:
                    anomalies.setdefault(
                        item["id"],
                        {
                            "score": 0.0,
                            "reason": (
                                f"Looks like a duplicate of the "
                                f"{earlier['date']} transaction."
                            ),
                        },
                    )
        previous[key] = item

    if len(expenses) < 8:
        return anomalies

    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in expenses:
        groups[item["category"]].append(item)

    for item in expenses:
        peers = groups.get(item["category"], [])
        baseline = peers if len(peers) >= 4 else expenses
        amounts = [peer["amount"] for peer in baseline]
        if len(amounts) < 4:
            continue

        median = statistics.median(amounts)
        if median <= 0:
            continue

        mad = _median_absolute_deviation(amounts, median)
        if mad > 0:
            robust_z = 0.6745 * (item["amount"] - median) / mad
        else:
            mean = statistics.mean(amounts)
            stdev = statistics.pstdev(amounts) or 1.0
            robust_z = (item["amount"] - mean) / stdev

        if robust_z >= 4.0 and item["amount"] >= median * 2:
            multiples = item["amount"] / median
            anomalies.setdefault(
                item["id"],
                {
                    "score": round(robust_z, 2),
                    "reason": (
                        f"About {multiples:.1f}x your usual {item['category']} "
                        "spending."
                    ),
                },
            )

    return anomalies


def analyze_transactions(transactions: list[dict[str, Any]]) -> dict[str, Any]:
    clean_transactions = [_normalise_transaction(item) for item in transactions]
    full_model, seed_count, total_count = _build_model(clean_transactions)
    anomalies = detect_anomalies(clean_transactions)

    results: list[dict[str, Any]] = []

    if len(clean_transactions) <= 200:
        # Leave-one-out for small datasets so a transaction's existing label
        # cannot train the model that is asked to review it.
        for index, item in enumerate(clean_transactions):
            context = clean_transactions[:index] + clean_transactions[index + 1 :]
            model, _, _ = _build_model(context)
            category, confidence, source, alternatives = _predict_one(item, model)
            anomaly = anomalies.get(item["id"])
            differs = category != item["category"]
            results.append(
                {
                    "id": item["id"],
                    "type": item["type"],
                    "amount": item["amount"],
                    "description": item["description"],
                    "date": item["date"],
                    "current_category": item["category"],
                    "suggested_category": category,
                    "confidence": confidence,
                    "differs": differs,
                    "source": source,
                    "alternatives": alternatives,
                    "is_anomaly": anomaly is not None,
                    "anomaly_score": anomaly["score"] if anomaly else 0.0,
                    "anomaly_reason": anomaly["reason"] if anomaly else None,
                }
            )
    else:
        for item in clean_transactions:
            category, confidence, source, alternatives = _predict_one(item, full_model)
            anomaly = anomalies.get(item["id"])
            differs = category != item["category"]
            results.append(
                {
                    "id": item["id"],
                    "type": item["type"],
                    "amount": item["amount"],
                    "description": item["description"],
                    "date": item["date"],
                    "current_category": item["category"],
                    "suggested_category": category,
                    "confidence": confidence,
                    "differs": differs,
                    "source": source,
                    "alternatives": alternatives,
                    "is_anomaly": anomaly is not None,
                    "anomaly_score": anomaly["score"] if anomaly else 0.0,
                    "anomaly_reason": anomaly["reason"] if anomaly else None,
                }
            )

    suggestions = sum(
        1 for item in results if item["differs"] and item["confidence"] >= 0.65
    )
    return {
        "results": results,
        "summary": {
            "total": len(results),
            "suggestions": suggestions,
            "anomalies": len(anomalies),
            "trained_examples": total_count,
            "seed_examples": seed_count,
            "model": "naive-bayes+keyword-rules",
            "evaluation": "leave-one-out" if len(clean_transactions) <= 200 else "in-sample",
        },
        "categories": ALL_CATEGORIES,
    }
