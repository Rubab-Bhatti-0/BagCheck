from pathlib import Path
from threading import Lock

import numpy as np

_model = None
_model_lock = Lock()
MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2'


def get_model():
    global _model
    with _model_lock:
        if _model is None:
            from huggingface_hub import try_to_load_from_cache
            from sentence_transformers import SentenceTransformer

            cached_config = try_to_load_from_cache(MODEL_NAME, 'modules.json')
            model_path = MODEL_NAME
            if isinstance(cached_config, str):
                snapshot = Path(cached_config).parent
                if (snapshot / 'model.safetensors').is_file() or (snapshot / 'pytorch_model.bin').is_file():
                    model_path = str(snapshot)
            _model = SentenceTransformer(model_path)
        return _model


def embed(texts: list[str]) -> np.ndarray:
    return get_model().encode(texts, show_progress_bar=False)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))
