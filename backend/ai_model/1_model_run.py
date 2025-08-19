import os
import sys
import pandas as pd
import numpy as np
import joblib
import pymongo
from datetime import datetime

# -------------------- CONFIG --------------------
MONGO_URI       = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME         = os.getenv("DB_NAME", "sportsbetting")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "fixtures")
DEBUG           = os.getenv("DEBUG", "1") not in ("0", "false", "False", "")

base_path   = os.path.dirname(os.path.abspath(__file__))
scaler_path = os.path.join(base_path, "model", "scaler_model.joblib")
model_path  = os.path.join(base_path, "model", "calibrated_model.joblib")
value_bets_output = os.path.join(base_path, "ValueBets_Deployable.csv")

def dprint(*args, **kwargs):
    if DEBUG:
        print("[DEBUG]", *args, **kwargs)

# -------------------- DB CONNECT --------------------
try:
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    dprint(f"Connected to MongoDB @ {MONGO_URI}, DB='{DB_NAME}', COL='{COLLECTION_NAME}'")
except Exception as e:
    print(f"❌ Mongo connection failed: {e}")
    sys.exit(1)

# -------------------- FETCH DOCS --------------------
now_iso = datetime.utcnow().isoformat()
query = {"date": {"$gte": now_iso}}
dprint("Mongo query:", query)

try:
    docs = list(collection.find(query))
except Exception as e:
    print(f"❌ Mongo query failed: {e}")
    sys.exit(1)

print(f"Fetched {len(docs)} fixtures from MongoDB.")

if not docs:
    print("No upcoming fixtures found in MongoDB.")
    pd.DataFrame().to_csv(value_bets_output, index=False)
    sys.exit(0)

# -------------------- TRANSFORM -> FEATURES --------------------
records = []
missing_counts = { }
sample_missing = []

required_keys = [
    'Imp_B365H','Imp_B365D','Imp_B365A',
    'Imp_BbAvH','Imp_BbAvD','Imp_BbAvA',
    'HomeTeam_enc','AwayTeam_enc','Div_enc',
    'Home_Wins_Last5','Home_Draws_Last5','Home_Losses_Last5',
    'Away_Wins_Last5','Away_Draws_Last5','Away_Losses_Last5',
    'Draws_Diff_Last5','Wins_Diff_Last5','Losses_Diff_Last5'
]

for i, fx in enumerate(docs):
    try:
        row = {
            # model features
            'Imp_B365H':          fx.get('Imp_B365H'),
            'Imp_B365D':          fx.get('Imp_B365D'),
            'Imp_B365A':          fx.get('Imp_B365A'),
            'Imp_BbAvH':          fx.get('Imp_BbAvH'),
            'Imp_BbAvD':          fx.get('Imp_BbAvD'),
            'Imp_BbAvA':          fx.get('Imp_BbAvA'),
            'HomeTeam_enc':       (fx.get('homeTeam') or {}).get('enc'),
            'AwayTeam_enc':       (fx.get('awayTeam') or {}).get('enc'),
            'Div_enc':            fx.get('Div_enc'),
            'Home_Wins_Last5':    fx.get('Home_Wins_Last5'),
            'Home_Draws_Last5':   fx.get('Home_Draws_Last5'),
            'Home_Losses_Last5':  fx.get('Home_Losses_Last5'),
            'Away_Wins_Last5':    fx.get('Away_Wins_Last5'),
            'Away_Draws_Last5':   fx.get('Away_Draws_Last5'),
            'Away_Losses_Last5':  fx.get('Away_Losses_Last5'),
            'Draws_Diff_Last5':   fx.get('Draws_Diff_Last5'),
            'Wins_Diff_Last5':    fx.get('Wins_Diff_Last5'),
            'Losses_Diff_Last5':  fx.get('Losses_Diff_Last5'),

            # passthrough (kept as-is)
            'fixtureId':          fx.get('fixtureId'),
            'HomeTeam':           (fx.get('homeTeam') or {}).get('name'),
            'AwayTeam':           (fx.get('awayTeam') or {}).get('name'),
            'Date':               fx.get('date'),
            'timestamp':          fx.get('timestamp'),
        }

        missing = [k for k in required_keys if row.get(k) is None]
        if missing:
            for k in missing:
                missing_counts[k] = missing_counts.get(k, 0) + 1
            if len(sample_missing) < 10:
                sample_missing.append({
                    "fixtureId": row.get("fixtureId"),
                    "teams": f"{row.get('HomeTeam')} vs {row.get('AwayTeam')}",
                    "missing": missing
                })
            continue

        records.append(row)

    except Exception as e:
        if len(sample_missing) < 10:
            sample_missing.append({
                "fixtureId": fx.get("fixtureId"),
                "teams": f"{(fx.get('homeTeam') or {}).get('name')} vs {(fx.get('awayTeam') or {}).get('name')}",
                "error": str(e)
            })
        continue

dprint(f"Valid records: {len(records)} / {len(docs)}")
if missing_counts:
    dprint("Top missing required fields (count):",
           ", ".join([f"{k}:{v}" for k, v in sorted(missing_counts.items(), key=lambda x: -x[1])]))
    if sample_missing:
        dprint("Sample missing details (up to 10):")
        for s in sample_missing:
            dprint("  ->", s)

df = pd.DataFrame(records)
if df.empty:
    print("No valid fixtures with all required features. Writing empty CSV.")
    pd.DataFrame().to_csv(value_bets_output, index=False)
    sys.exit(0)

dprint("DataFrame shape after transform:", df.shape)
dprint("Columns:", list(df.columns))

# -------------------- LOAD MODEL + SCALER --------------------
if not os.path.exists(scaler_path):
    print(f"❌ Scaler not found at {scaler_path}")
    sys.exit(1)
if not os.path.exists(model_path):
    print(f"❌ Model not found at {model_path}")
    sys.exit(1)

dprint("Loading scaler:", scaler_path)
dprint("Loading model :", model_path)

try:
    scaler = joblib.load(scaler_path)
    model  = joblib.load(model_path)
except Exception as e:
    print(f"❌ Failed to load scaler/model: {e}")
    sys.exit(1)

# -------------------- PREDICT --------------------
features = [
    'Imp_B365H','Imp_B365D','Imp_B365A',
    'Imp_BbAvH','Imp_BbAvD','Imp_BbAvA',
    'HomeTeam_enc','AwayTeam_enc','Div_enc',
    'Home_Wins_Last5','Home_Draws_Last5','Home_Losses_Last5',
    'Away_Wins_Last5','Away_Draws_Last5','Away_Losses_Last5',
    'Draws_Diff_Last5','Wins_Diff_Last5','Losses_Diff_Last5'
]

if any(col not in df.columns for col in features):
    missing_feat_cols = [c for c in features if c not in df.columns]
    print(f"❌ Missing feature columns in DataFrame: {missing_feat_cols}")
    sys.exit(1)

X = df[features]
dprint("Feature matrix shape:", X.shape)
dprint("Any NaNs in features?:", X.isna().any().any())

try:
    X_scaled = scaler.transform(X)
    probs    = model.predict_proba(X_scaled)
except Exception as e:
    print(f"❌ Inference failed: {e}")
    sys.exit(1)

pred_indices = np.argmax(probs, axis=1)
target_map   = {0: 'A', 1: 'D', 2: 'H'}
df['FTR_pred'] = [target_map[i] for i in pred_indices]
df[['Prob_A','Prob_D','Prob_H']] = probs

pred_counts = df['FTR_pred'].value_counts(dropna=False).to_dict()
dprint("Prediction class counts:", pred_counts)

# -------------------- POST-PROCESS (unchanged) --------------------
df['Est_BbAvH'] = 1 / df['Imp_BbAvH']
df['Est_BbAvD'] = 1 / df['Imp_BbAvD']
df['Est_BbAvA'] = 1 / df['Imp_BbAvA']

def get_odds_probs(row):
    if row['FTR_pred'] == 'H':
        return row['Est_BbAvH'], row['Prob_H']
    elif row['FTR_pred'] == 'D':
        return row['Est_BbAvD'], row['Prob_D']
    else:
        return row['Est_BbAvA'], row['Prob_A']

df[['chosen_odds','chosen_prob']] = df.apply(get_odds_probs, axis=1, result_type='expand')

df['Expected_Value'] = df['chosen_prob'] * df['chosen_odds'] - 1
df['confidence']     = df[['Prob_A','Prob_D','Prob_H']].max(axis=1)
df['prob_gap']       = df[['Prob_A','Prob_D','Prob_H']].max(axis=1) - df[['Prob_A','Prob_D','Prob_H']].min(axis=1)
df['spread_skew']    = (df['Prob_H'] - df['Prob_A']).abs()

df['Value_Bet'] = (df['Expected_Value'] > 0.05) & (df['confidence'] > 0.35)

val_count = int(df['Value_Bet'].sum())
dprint(f"Value bets flagged: {val_count} / {len(df)}")
if DEBUG and val_count > 0:
    cols_preview = ['Date','HomeTeam','AwayTeam','FTR_pred','chosen_odds','chosen_prob','Expected_Value','confidence']
    dprint("Sample value bets (up to 5):")
    dprint(df.loc[df['Value_Bet'], cols_preview].head(5).to_string(index=False))

# Staking (unchanged)
df['Kelly'] = np.clip(
    (df['chosen_prob'] * (df['chosen_odds'] - 1) - (1 - df['chosen_prob'])) / (df['chosen_odds'] - 1),
    0, 1
)
df['Confidence_Stake'] = df['confidence']

# -------------------- SAVE --------------------
try:
    df.to_csv(value_bets_output, index=False)
    print(f"💾 Saved: {value_bets_output} (rows: {len(df)})")
except Exception as e:
    print(f"❌ Failed to write CSV: {e}")
    sys.exit(1)
