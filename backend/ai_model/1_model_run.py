import pandas as pd
import numpy as np
import joblib
import os

# 1. Base path for this script
base_path = os.path.dirname(os.path.abspath(__file__))

# 2. Input paths
csv_path = os.path.join(base_path, "Cleaned_Enhanced_All_Seasons_Features.csv")
scaler_path = os.path.join(base_path, "model", "scaler_model.joblib")
model_path = os.path.join(base_path, "model", "calibrated_model.joblib")

# 3. Output paths
value_bets_output = os.path.join(base_path, "ValueBets_Deployable.csv")
# predictions_output = os.path.join(base_path, "FTR_Predictions_Deployable.csv")

# 4. Load the dataset
df = pd.read_csv(csv_path)

# 5. Define feature columns
features = [
    'Imp_B365H', 'Imp_B365D', 'Imp_B365A',
    'Imp_BbAvH', 'Imp_BbAvD', 'Imp_BbAvA',
    'HomeTeam_enc', 'AwayTeam_enc', 'Div_enc',
    'Home_Wins_Last5', 'Home_Draws_Last5', 'Home_Losses_Last5',
    'Away_Wins_Last5', 'Away_Draws_Last5', 'Away_Losses_Last5',
    'Draws_Diff_Last5', 'Wins_Diff_Last5', 'Losses_Diff_Last5'
]
X = df[features]

# 6. Load model + scaler
scaler = joblib.load(scaler_path)
model = joblib.load(model_path)

# 7. Scale + predict
X_scaled = scaler.transform(X)
probs = model.predict_proba(X_scaled)
pred_indices = np.argmax(probs, axis=1)
target_map = {0: 'A', 1: 'D', 2: 'H'}
df['FTR_pred'] = [target_map[i] for i in pred_indices]
df[['Prob_A', 'Prob_D', 'Prob_H']] = probs

# 8. Estimate odds
df['Est_BbAvH'] = 1 / df['Imp_BbAvH']
df['Est_BbAvD'] = 1 / df['Imp_BbAvD']
df['Est_BbAvA'] = 1 / df['Imp_BbAvA']

# 9. Select chosen odds/probs
def get_odds_probs(row):
    if row['FTR_pred'] == 'H':
        return row['Est_BbAvH'], row['Prob_H']
    elif row['FTR_pred'] == 'D':
        return row['Est_BbAvD'], row['Prob_D']
    else:
        return row['Est_BbAvA'], row['Prob_A']

df[['chosen_odds', 'chosen_prob']] = df.apply(get_odds_probs, axis=1, result_type='expand')

# 10. Meta features + EV
df['Expected_Value'] = df['chosen_prob'] * df['chosen_odds'] - 1
df['confidence'] = df[['Prob_A', 'Prob_D', 'Prob_H']].max(axis=1)
df['prob_gap'] = df[['Prob_A', 'Prob_D', 'Prob_H']].max(axis=1) - df[['Prob_A', 'Prob_D', 'Prob_H']].min(axis=1)
df['spread_skew'] = abs(df['Prob_H'] - df['Prob_A'])

# 11. Value bet filter
df['Value_Bet'] = (df['Expected_Value'] > 0.05) & (df['confidence'] > 0.35)

# 12. Staking models
df['Kelly'] = np.clip(
    (df['chosen_prob'] * (df['chosen_odds'] - 1) - (1 - df['chosen_prob'])) / (df['chosen_odds'] - 1),
    0, 1
)
df['Confidence_Stake'] = df['confidence']

# 13. Filter value bets
value_bets = df[df['Value_Bet']].copy()

# 14. Safely inject HomeTeam / AwayTeam if they exist
for col in ['HomeTeam', 'AwayTeam']:
    if col in df.columns:
        value_bets[col] = df.loc[value_bets.index, col]

# 15. Save outputs (all available columns)
#value_bets.to_csv(value_bets_output, index=False)
df.to_csv(value_bets_output, index=False)
# df[['FTR_pred', 'Prob_H', 'Prob_D', 'Prob_A']].to_csv(predictions_output, index=False)

print(f"💾 Saved: {value_bets_output}")
# print(f"💾 Saved: {predictions_output}")