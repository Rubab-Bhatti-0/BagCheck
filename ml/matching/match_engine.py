import sqlite3, os
from .embed import embed, cosine_similarity

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'bagcheck.db')
THRESHOLD = 0.45


def find_matches(report_id: int, title: str, description: str, category: str, campus_id: int, report_type: str) -> list:
    text = f"{title}. {description}. {category}"
    query_vec = embed(text)

    opposite_type = 'Found' if report_type == 'Lost' else 'Lost'

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("""
            SELECT id, title, description, category, campus_id, type, location, event_date, photo_url
            FROM reports
            WHERE type = ? AND status = 'Active' AND moderation_status = 'Approved'
            AND campus_id = ? AND id != ?
            LIMIT 50
        """, (opposite_type, campus_id, report_id or -1))
        candidates = cur.fetchall()
        conn.close()
    except Exception as e:
        print(f"DB error: {e}")
        return []

    results = []
    for row in candidates:
        candidate_text = f"{row['title']}. {row['description']}. {row['category']}"
        candidate_vec = embed(candidate_text)
        score = cosine_similarity(query_vec, candidate_vec)
        if score >= THRESHOLD:
            results.append({
                "report_id": row['id'],
                "title": row['title'],
                "description": row['description'],
                "type": row['type'],
                "location": row['location'],
                "event_date": row['event_date'],
                "photo_url": row['photo_url'],
                "score": round(score * 100, 1)
            })

    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:3]
