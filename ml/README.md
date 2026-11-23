# BagCheck ML Service

A lightweight FastAPI microservice providing two ML-powered endpoints for the BagCheck lost-and-found platform.

## Features

| Endpoint | Purpose |
|---|---|
| `POST /api/moderate` | Content moderation — classifies a post as relevant (lost/found) or irrelevant (spam) |
| `POST /api/match` | Semantic matching — finds similar reports from the database using sentence embeddings |

---

## Setup

### 1. Install dependencies

From the `ml/` directory:

```bash
pip install -r requirements.txt
```

> The first match request with eligible candidates downloads `all-MiniLM-L6-v2` (~90 MB) if needed. The service can load a complete cached copy offline.

### 2. Train the moderation classifier

Run from the `ml/` directory:

```bash
python -m moderate.train
```

This trains a TF-IDF + Logistic Regression model on the bundled dataset (120 relevant + 120 irrelevant examples) and saves it to `moderate/model.pkl`.

### 3. Start the service

```bash
uvicorn api:app --port 8000 --reload
```

The service will be available at `http://localhost:8000`.

---

## Endpoints

### `GET /health`

Health check.

```bash
curl http://localhost:8000/health
```

**Response:**
```json
{"status": "ok"}
```

---

### `POST /api/moderate`

Classify whether a post is a valid lost/found report.

**Request body:**
```json
{
  "title": "Lost my wallet",
  "description": "I lost my brown leather wallet near the library cafeteria"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/moderate \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"Lost my wallet\", \"description\": \"Brown wallet near the library\"}"
```

**Response:**
```json
{
  "relevant": true,
  "confidence": 0.964,
  "reason": "classifier"
}
```

> If `model.pkl` has not been trained, the service uses lost-and-found text rules. Rule-based decisions have `confidence: null`.

---

### `POST /api/match`

Find semantically similar reports of the opposite type (Lost ↔ Found) from the same campus.

**Request body:**
```json
{
  "report_id": 42,
  "title": "Lost black earbuds",
  "description": "Lost my wireless Sony earbuds near the CS block",
  "category": "Electronics",
  "campus_id": 1,
  "type": "Lost"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/match \
  -H "Content-Type: application/json" \
  -d "{\"report_id\": 42, \"title\": \"Lost black earbuds\", \"description\": \"Lost near CS block\", \"category\": \"Electronics\", \"campus_id\": 1, \"type\": \"Lost\"}"
```

**Response:**
```json
{
  "matches": [
    {
      "report_id": 17,
      "title": "Found black wireless earphones",
      "description": "Found near the computer science department",
      "type": "Found",
      "location": "CS Block",
      "event_date": "2024-11-20",
      "photo_url": null,
      "score": 87.3
    }
  ]
}
```

> `score` is a percentage (0–100). Only matches above 45% cosine similarity are returned. Up to 3 top matches are returned.

---

## Architecture

```
ml/
├── api.py                    # FastAPI app — main entry point
├── moderate/
│   ├── __init__.py
│   ├── classifier.py         # Model loader + inference
│   ├── train.py              # Training script
│   └── dataset/
│       ├── relevant.csv      # 120 valid lost/found examples (label=1)
│       └── irrelevant.csv    # 120 irrelevant/spam examples (label=0)
├── matching/
│   ├── __init__.py
│   ├── match_engine.py       # Semantic matching logic
│   └── embed.py              # Sentence embedding wrapper
├── requirements.txt
└── README.md
```

### Content Moderation
- **Model:** TF-IDF (unigrams + bigrams, 5000 features) + Logistic Regression
- **Framework:** scikit-learn
- **Dataset:** 240 examples (120 relevant / 120 irrelevant), Pakistani university context
- **Persisted as:** `moderate/model.pkl`

### Semantic Matching
- **Model:** `sentence-transformers/all-MiniLM-L6-v2` (22M parameters, ~90 MB download)
- **Similarity:** Cosine similarity on 384-dimensional embeddings
- **Threshold:** 0.45 cosine similarity (~45%)
- **Database:** Reads the MongoDB `reports` collection using `MONGODB_URI` and `MONGODB_DB_NAME`

---

## Notes

- Run all commands from the `ml/` directory.
- The MongoDB settings come from the process environment or `ml/.env`, with `backend/.env` as a fallback. Set them to the same database as the backend. `/api/match` returns HTTP 503 when the database or model is unavailable and returns an empty list when a successful search finds no matches.
- The sentence-transformers model is downloaded on first use and cached by Hugging Face locally.
