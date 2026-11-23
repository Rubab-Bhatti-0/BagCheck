import os
import pickle
import re

_model = None
CLASSIFIER_THRESHOLD = 0.65

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
    'lunchbox', 'lunch', 'manual', 'powerbank', 'speaker', 'pen', 'pencil',
    'helmet', 'necklace', 'bracelet', 'earrings', 'iphone', 'sweater', 'shoes', 'sunglasses',
}
ITEM_TERMS = re.compile(r"\b(?:" + '|'.join(sorted(ITEM_WORDS)) + r")(?:s|es)?\b", re.IGNORECASE)
STORY_TERMS = re.compile(
    r"\b(?:lost|lose|missing|misplaced|forgot(?:ten)?|left|found|picked up|returned|recover|"
    r"(?:cannot|can['’]t|couldn['’]t) find|did anyone (?:find|see)|looking for my)\b",
    re.IGNORECASE,
)
NON_REPORT_TITLE = re.compile(r'\b(?:for sale|selling|buyer wanted|hiring|found a (?:great deal|job))\b', re.IGNORECASE)


def load_model():
    global _model
    if _model is None:
        path = os.path.join(os.path.dirname(__file__), 'model.pkl')
        if os.path.exists(path):
            with open(path, 'rb') as f:
                _model = pickle.load(f)
    return _model


def is_relevant(title: str, description: str) -> dict:
    title = title.strip()
    description = description.strip()
    text = f'{title}. {description}'
    title_has_item = bool(ITEM_TERMS.search(title))
    title_relevant = title_has_item or bool(STORY_TERMS.search(title))
    if not title_relevant or NON_REPORT_TITLE.search(title):
        return {'relevant': False, 'title_relevant': False, 'confidence': None, 'reason': 'title_not_relevant'}
    if not description:
        return {'relevant': False, 'title_relevant': True, 'confidence': None, 'reason': 'content_not_relevant'}

    model = load_model()
    has_story = bool(STORY_TERMS.search(text))
    if model is not None:
        probabilities = dict(zip(model.classes_, model.predict_proba([text])[0]))
        relevant_probability = float(probabilities[1])
        if probabilities[0] >= CLASSIFIER_THRESHOLD:
            return {'relevant': False, 'title_relevant': True, 'confidence': round(1 - relevant_probability, 3), 'reason': 'classifier_rejection'}
        if relevant_probability >= CLASSIFIER_THRESHOLD:
            return {'relevant': True, 'title_relevant': True, 'confidence': round(relevant_probability, 3), 'reason': 'classifier'}

    return {
        'relevant': has_story,
        'title_relevant': True,
        'confidence': None,
        'reason': 'heuristic_fallback' if has_story else 'content_not_relevant',
    }
