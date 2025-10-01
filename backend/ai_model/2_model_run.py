import pandas as pd
import numpy as np
import joblib
import os
import pymongo
from dotenv import load_dotenv

# -------------------- CONFIG --------------------
load_dotenv()
MONGO_URI       = os.getenv("MONGO_URI", "<fallback-uri>")
DB_NAME         = os.getenv("DB_NAME", "sportsbetting")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "value_bets")

# 1. Base path for this script
base_path = os.path.dirname(os.path.abspath(__file__))

# 2. Input paths
csv_path = os.path.join(base_path, "ValueBets_Deployable.csv")
meta_model_path = os.path.join(base_path, "model", "meta_model.joblib")

# -------------------- FETCH FROM DB --------------------
client = pymongo.MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

docs = list(collection.find({}))
if not docs:
    print("⚠️ No value bets found in MongoDB.")
    pd.DataFrame().to_csv(csv_path, index=False)
    exit(0)

df = pd.DataFrame(docs)
print(f"📥 Loaded {len(df)} records from MongoDB collection '{COLLECTION_NAME}'")

# -------------------- LOAD META MODEL --------------------
meta_model = joblib.load(meta_model_path)

# -------------------- META FEATURES --------------------
meta_features = [
    'Expected_Value', 'confidence', 'prob_gap', 'spread_skew',
    'Kelly', 'Confidence_Stake'
]

# -------------------- PREDICT SUCCESS PROBABILITIES --------------------
df['meta_success_prob'] = meta_model.predict_proba(df[meta_features])[:, 1]

# -------------------- FLAG VALUE BETS --------------------
df['isValueBet'] = (df['meta_success_prob'] > 0.55) & (df['Expected_Value'] > 0)

# -------------------- SAVE BACK TO CSV --------------------
df.to_csv(csv_path, index=False)
print(f"✅ Updated file with isValueBet column: {csv_path}")

# -------------------- SAVE BACK TO DB --------------------
try:
    # Convert NaN to None for MongoDB
    df_for_db = df.replace({np.nan: None})
    records = df_for_db.to_dict(orient="records")

    updated_count = 0
    for rec in records:
        if not rec.get("fixtureId"):
            continue
        collection.update_one(
            {"fixtureId": rec["fixtureId"]},
            {"$set": {
                "meta_success_prob": rec.get("meta_success_prob"),
                "isValueBet": rec.get("isValueBet")
            }},
            upsert=False  # don’t insert new docs, only update existing ones
        )
        updated_count += 1

    print(f"💾 Updated {updated_count} records in MongoDB with isValueBet + meta_success_prob")
except Exception as e:
    print(f"❌ Failed to update MongoDB: {e}")
