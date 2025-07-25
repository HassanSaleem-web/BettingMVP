
# 🧠 AI-Driven Sports Betting System (Full Stack)

A production-ready AI-powered sports betting platform that uses machine learning to predict football match outcomes, identify value bets, and allow users to simulate bets with interactive tracking, analytics, and profit monitoring.

---

## ⚙️ Tech Stack

| Layer        | Stack / Tool                 |
| ------------ | ---------------------------- |
| Frontend     | React, Tailwind CSS          |
| Backend      | Node.js, Express.js, MongoDB |
| AI/ML Engine | Python, pandas, scikit-learn |
| Database     | MongoDB via Mongoose         |
| Deployment   | Render / Localhost (dev)     |

---

## 🗂️ Project Structure

```
.
├── backend/
│   ├── ai_model/
│   │   ├── 1_model_run.py            # Main prediction script
│   │   ├── 2_model_run.py            # Meta-model evaluator
│   │   ├── model/                    # Stored ML models (.joblib)
│   │   └── *.csv                     # Prediction output data
│   ├── controllers/                 # Express route handlers
│   ├── middleware/                  # JWT middleware etc.
│   ├── models/                      # Mongoose schemas
│   ├── routes/                      # Express route declarations
│   ├── utils/                       # Match ID generator etc.
│   ├── server.js                    # Entry point
│   ├── .env                         # Mongo URI and config
│   └── package.json                 # Backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.js                   # Main React app
│   │   ├── components/             # BetTable, Auth etc.
│   ├── .env                        # REACT_APP_API_URL
│   └── package.json               # Frontend dependencies
│
├── README.md                       # This file
└── working.md                     # Developer Notes
```

---

## 🧠 AI Betting Model (How It Works)

### `1_model_run.py` — Match Outcome Prediction

1. Loads historical feature data from `Cleaned_Enhanced_All_Seasons_Features.csv`.
2. Predicts outcome using a calibrated classification model.
3. Estimates win probabilities (`Prob_H`, `Prob_D`, `Prob_A`).
4. Converts to **implied odds**: `Est_BbAvH`, `Est_BbAvD`, `Est_BbAvA`.
5. Chooses best bet based on highest predicted probability.
6. Calculates:

   * Expected Value: `EV = prob * odds - 1`
   * Confidence
   * Probability spread
   * Kelly stake sizing

✅ Outputs to: `ValueBets_Deployable.csv`

---

### `2_model_run.py` — Meta Success Filter

1. Loads the value bets file.
2. Uses trained `meta_model.joblib` to compute `meta_success_prob`.
3. Applies filters:

   * `Expected_Value > 0`
   * `meta_success_prob > 0.55`
4. Flags `isValueBet = True` if filters pass.

✅ Overwrites `ValueBets_Deployable.csv` with `isValueBet` flag.

---

## 💻 Backend (Node.js + Express)

### Key Features

* Stores user bets via `/api/bets/add`
* Supports status updates (win/loss) and deletion (soft delete)
* Loads all available bets from the AI CSV output via `/api/bets/valuebets`
* MongoDB used to persist user-specific bet history

### Run Backend

```bash
cd backend
npm install
npm run dev
```

`.env` file format:

```env
MONGO_URI=mongodb+srv://<your_mongo_connection>
PORT=5000
```

---

## 🖥️ Frontend (React)

### Features

* Interactive dashboard with:

  * Bet placement
  * Historical P/L tracking
  * ROI display
  * Match breakdown (Home/Draw/Away odds)
* Real-time visual updates
* Authentication (basic)

### Run Frontend

```bash
cd frontend
npm install
npm start
```

`.env` file format:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🧮 Odds & Probability Explanation

For each match:

* `FTR_pred`: predicted result ("H", "D", "A")
* `Prob_H/D/A`: win/draw/lose probabilities
* `Est_BbAvH/D/A`: implied odds (1 / implied prob)
* `chosen_prob`, `chosen_odds`: highest confidence selection
* `Expected_Value`: indicates if it's a "value bet"
* `Kelly`: bet sizing suggestion using Kelly Criterion
* `isValueBet`: final filter used by the app

---

## 🧪 Example API Responses

### `POST /api/bets/add`

```json
{
  "user_id": "user123",
  "match_id": "2023-08-21-TEAM1-TEAM2",
  "sport": "Football",
  "stake": 50,
  "odds": 2.1
}
```

### `GET /api/bets/user-bets`

```json
[
  {
    "_id": "...",
    "user_id": "user123",
    "match_id": "2023-08-21-TEAM1-TEAM2",
    "stake": 50,
    "odds": 2.1,
    "status": "won",
    "profit": 55,
    ...
  }
]
```

---

## 🧠 AI Model Outputs (CSV)

| Column          | Description                       |
| --------------- | --------------------------------- |
| FTR\_pred       | Predicted full-time result        |
| Prob\_H/D/A     | ML confidence for each outcome    |
| Est\_BbAvH/D/A  | Estimated odds for each outcome   |
| chosen\_odds    | Selected odds based on prediction |
| chosen\_prob    | ML probability for chosen bet     |
| Expected\_Value | EV = prob × odds − 1              |
| Kelly           | Kelly stake %                     |
| isValueBet      | Final boolean filter (meta-model) |

---

## 📊 Frontend Dashboard (React)

* Displays user bets in a table with:

  * Match
  * Date
  * Stake
  * Odds
  * Outcome (P/L)
  * Est\_BbAvH/D/A values shown under Odds breakdown
* Action buttons: Cancel bet (if pending)

---

## 🧠 Deployment Notes

* `ValueBets_Deployable.csv` can be regenerated by running both Python scripts.
* Backend auto-loads latest CSV when required.
* Future feature: auto-run Python prediction on CRON every 6 hours.

---

## 📜 License

For research and development use only. Not to be used for real-money betting without legal compliance.

