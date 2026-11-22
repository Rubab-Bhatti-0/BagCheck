import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import pickle, os

# Load data
rel = pd.read_csv(os.path.join(os.path.dirname(__file__), 'dataset', 'relevant.csv'))
irr = pd.read_csv(os.path.join(os.path.dirname(__file__), 'dataset', 'irrelevant.csv'))
df = pd.concat([rel, irr]).sample(frac=1, random_state=42).reset_index(drop=True)

X, y = df['text'], df['label']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
    ('clf', LogisticRegression(max_iter=1000, C=1.0))
])
pipeline.fit(X_train, y_train)
print(classification_report(y_test, pipeline.predict(X_test)))

model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
with open(model_path, 'wb') as f:
    pickle.dump(pipeline, f)
print(f"Model saved to {model_path}")
