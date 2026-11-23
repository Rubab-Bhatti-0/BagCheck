import logging
import os
from hmac import compare_digest
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from moderate.classifier import is_relevant
from matching.match_engine import find_matches

app = FastAPI(title="BagCheck ML Service")
logger = logging.getLogger(__name__)

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
    type: Literal['Lost', 'Found']


def require_ml_token(token: Annotated[str, Header(alias="X-ML-Service-Token")] = "") -> None:
    expected = os.getenv("ML_SERVICE_TOKEN", "")
    if not expected or not compare_digest(token.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/moderate", dependencies=[Depends(require_ml_token)])
def moderate(req: ModerateRequest):
    result = is_relevant(req.title, req.description)
    messages = {
        'title_not_relevant': 'The title must name an item or describe what was lost or found.',
        'content_not_relevant': 'The title and description must describe an item that was lost or found.',
        'classifier_rejection': 'The title and description do not describe a lost or found item.',
    }
    return {**result, 'message': messages.get(result['reason'], 'This looks like a relevant lost or found report.')}


@app.post("/api/match", dependencies=[Depends(require_ml_token)])
def match(req: MatchRequest):
    try:
        matches = find_matches(req.report_id, req.title, req.description, req.category, req.campus_id, req.type)
    except Exception as error:
        logger.error('Matching failed (%s)', type(error).__name__)
        raise HTTPException(status_code=503, detail='Matching is temporarily unavailable.') from error
    return {"matches": matches}
