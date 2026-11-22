from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from moderate.classifier import is_relevant
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
    type: str  # "Lost" or "Found"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/moderate")
def moderate(req: ModerateRequest):
    result = is_relevant(req.title, req.description)
    return result


@app.post("/api/match")
def match(req: MatchRequest):
    matches = find_matches(
        req.report_id,
        req.title,
        req.description,
        req.category,
        req.campus_id,
        req.type,
    )
    return {"matches": matches}
