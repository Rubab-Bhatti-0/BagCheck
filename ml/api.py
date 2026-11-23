from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from moderate.classifier import heuristic_relevance, is_relevant
from matching.match_engine import find_matches

app = FastAPI(title="BagCheck ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ModerateRequest(BaseModel):
    title: str
    description: str


class MatchRequest(BaseModel):
    report_id: int = -1
    title: str
    description: str
    category: str = "General"
    campus_id: int
    type: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/moderate")
def moderate(req: ModerateRequest):
    title_check = heuristic_relevance(req.title, "")
    combined_check = heuristic_relevance(req.title, req.description)
    if not title_check["title_relevant"]:
        return {"relevant": False, "confidence": 0.99, "reason": "title_not_relevant", "message": "The title is not relevant to a lost or found item."}
    if not combined_check["relevant"]:
        return {"relevant": False, "confidence": 0.9, "reason": "content_not_relevant", "message": "The title and description must describe an item that was lost or found."}

    result = is_relevant(req.title, req.description)
    if result["relevant"] is False:
        return {**result, "message": "The title and description do not describe a lost or found item."}
    return {**result, "relevant": True, "title_relevant": True, "message": "This looks like a relevant lost or found report."}


@app.post("/api/match")
def match(req: MatchRequest):
    matches = find_matches(req.report_id, req.title, req.description, req.category, req.campus_id, req.type)
    return {"matches": matches}
