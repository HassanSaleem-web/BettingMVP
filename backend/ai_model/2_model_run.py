import pandas as pd
import numpy as np
import joblib
import os

# 1. Base path for this script
base_path = os.path.dirname(os.path.abspath(__file__))

# 2. Input paths
csv_path = os.path.join(base_path, "ValueBets_Deployable.csv")
meta_model_path = os.path.join(base_path, "model", "meta_model.joblib")

# 3. Load value bet dataset
df = pd.read_csv(csv_path)

# 4. Load trained meta-model
meta_model = joblib.load(meta_model_path)

# 5. Meta-features used during training
meta_features = [
    'Expected_Value', 'confidence', 'prob_gap', 'spread_skew',
    'Kelly', 'Confidence_Stake'
]

# 6. Predict success probabilities
df['meta_success_prob'] = meta_model.predict_proba(df[meta_features])[:, 1]

# 7. Add isValueBet column based on meta-model filter
# 7. Add isValueBet column with EV > 0 condition
df['isValueBet'] = (df['meta_success_prob'] > 0.55) & (df['Expected_Value'] > 0)


# # 8. Simulate profit using Kelly staking only for value bets
# df['profit_kelly'] = np.where(
#     (df['isValueBet']) & (df['FTR'] == df['FTR_pred']),
#     df['Kelly'] * (df['chosen_odds'] - 1),
#     np.where(df['isValueBet'], -df['Kelly'], 0)
# )

# 9. Save back into the same file
df.to_csv(csv_path, index=False)
print(f"✅ Updated file with isValueBet column: {csv_path}")
