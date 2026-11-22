import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from .embed import embed, cosine_similarity

load_dotenv(Path(__file__).resolve().parents[2] / 'backend' / '.env')
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://127.0.0.1:27017')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'bagcheck')
THRESHOLD = 0.45


def find_matches(report_id: int, title: str, description: str, category: str, campus_id: int, report_type: str) -> list:
    text = f"{title}. {description}. {category}"
    query_vec = embed(text)

    opposite_type = 'Found' if report_type == 'Lost' else 'Lost'

    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
        reports = client[MONGODB_DB_NAME]['reports']
        candidates = list(reports.find({
            'type': opposite_type,
            'status': 'Active',
            'moderation_status': 'Approved',
            'campus_id': campus_id,
            'id': {'$ne': report_id or -1},
        }, {
            '_id': 0, 'id': 1, 'title': 1, 'description': 1, 'category': 1,
            'campus_id': 1, 'type': 1, 'location': 1, 'event_date': 1, 'photo_url': 1,
        }).limit(50))
        client.close()
    except Exception as e:
        print(f"DB error: {e}")
        return []

    results = []
    for row in candidates:
        candidate_text = f"{row.get('title', '')}. {row.get('description', '')}. {row.get('category', '')}"
        candidate_vec = embed(candidate_text)
        score = cosine_similarity(query_vec, candidate_vec)
        if score >= THRESHOLD:
            results.append({
                "report_id": row.get('id'),
                "title": row.get('title'),
                "description": row.get('description'),
                "type": row.get('type'),
                "location": row.get('location'),
                "event_date": row.get('event_date'),
                "photo_url": row.get('photo_url'),
                "score": round(score * 100, 1)
            })

    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:3]
