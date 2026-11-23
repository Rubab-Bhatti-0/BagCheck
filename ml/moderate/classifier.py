import os
import pickle
import re

_model = None

# Common item words make titles such as "Black wallet" valid even when they do not
# contain the words "lost" or "found". The surrounding description still needs a
# loss/found story signal.
ITEM_WORDS = {
    'wallet', 'purse', 'phone', 'mobile', 'laptop', 'charger', 'earbuds', 'earphones',
    'airpods', 'headphones', 'keys', 'key', 'keychain', 'card', 'id', 'cnic',
    'passport', 'certificate', 'book', 'notebook', 'bag', 'backpack', 'pouch',
    'bottle', 'umbrella', 'watch', 'wristwatch', 'calculator', 'glasses', 'spectacles',
    'jacket', 'hoodie', 'coat', 'scarf', 'cap', 'hat', 'document', 'file', 'folder',
    'usb', 'drive', 'mouse', 'keyboard', 'tablet', 'ipad', 'camera', 'ring', 'jewelry',
    'lunchbox', 'lunch', 'manual', 'charger', 'powerbank', 'speaker', 'pen', 'pencil',
}
STORY_TERMS = re.compile(
    r'\b(lost|lose|missing|misplaced|forgot|left|found|find|found|picked up|returned|return|recover|cannot find|can’t find|did anyone)\b',
    re.IGNORECASE,
)


def load_model():
    global _model
    if _model is None:
        path = os.path.join(os.path.dirname(__file__), 'model.pkl')
        if os.path.exists(path):
            with open(path, 'rb') as f:
                _model = pickle.load(f)
    return _model


def heuristic_relevance(title: str, description: str) -> dict:
    title_text = str(title or '').strip().lower()
    combined = f'{title_text} {str(description or '').strip().lower()}'
    title_item_signal = any(re.search(rf'\b{re.escape(word)}\b', title_text) for word in ITEM_WORDS)
    title_story_signal = bool(STORY_TERMS.search(title_text))
    story_signal = bool(STORY_TERMS.search(combined))
    title_relevant = title_item_signal or title_story_signal
    combined_relevant = title_relevant and story_signal
    return {
        'relevant': combined_relevant,
        'title_relevant': title_relevant,
        'reason': 'heuristic',
    }


def is_relevant(title: str, description: str) -> dict:
    heuristic = heuristic_relevance(title, description)
    if not heuristic['relevant']:
        return {'relevant': False, 'confidence': 0.99 if not heuristic['title_relevant'] else 0.9, 'reason': heuristic['reason']}

    model = load_model()
    if model is None:
        return {'relevant': True, 'confidence': 0.8, 'reason': 'heuristic_fallback'}

    text = f'{title}. {description}'
    pred = model.predict([text])[0]
    proba = model.predict_proba([text])[0]
    confidence = float(max(proba))
    # The heuristic protects valid concise item titles from a TF-IDF model that
    # has never seen that exact item name. It still rejects content without an
    # item title and a loss/found story.
    return {
        'relevant': bool(pred == 1) or heuristic['relevant'],
        'confidence': round(max(confidence, 0.8), 3),
        'reason': 'classifier_with_heuristic',
    }
