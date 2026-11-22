import pickle, os

_model = None


def load_model():
    global _model
    if _model is None:
        path = os.path.join(os.path.dirname(__file__), 'model.pkl')
        if os.path.exists(path):
            with open(path, 'rb') as f:
                _model = pickle.load(f)
    return _model


def is_relevant(title: str, description: str) -> dict:
    model = load_model()
    text = f"{title}. {description}"
    if model is None:
        return {"relevant": True, "confidence": 1.0, "reason": "model_not_trained"}
    pred = model.predict([text])[0]
    proba = model.predict_proba([text])[0]
    confidence = float(max(proba))
    return {
        "relevant": bool(pred == 1),
        "confidence": round(confidence, 3),
        "reason": "classifier"
    }
