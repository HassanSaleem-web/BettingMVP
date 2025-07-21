# AI-Driven Sports Betting System

A production-ready AI-driven sports betting system that uses machine learning to predict the outcome of sports events and identify value bets.

## Project Structure

```
sport-betting-mvp/
├── backend/
│   ├── main.py              # FastAPI backend app
│   ├── ml_model.py          # ML prediction model
│   ├── data/                # Sample sports odds & historical data
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.js           # React main app
│   │   ├── components/      # UI components
│   │   └── index.js         # React entry point
│   ├── public/              # Static assets
│   └── package.json         # NPM dependencies
├── README.md                # This file
└── working.md               # Detailed usage guide
```

## Features

- **Real-time Odds Monitoring**: Monitors betting odds from bookmakers
- **AI Prediction Engine**: ML model that predicts true win probabilities
- **Value Bet Detection**: Identifies bets with positive expected value (EV)
- **Interactive Dashboard**: Visual representation of betting opportunities
- **Real-time Notifications**: Alerts for new value bets
- **User Authentication**: Secure login system

## Technology Stack

- **Backend**: Python with FastAPI
- **Frontend**: React with Chart.js for visualization
- **Styling**: Tailwind CSS
- **ML Model**: Advanced prediction algorithms

## Quick Start

See [working.md](working.md) for detailed setup and usage instructions.

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd sport-betting-mvp/backend
   ```

2. Create a virtual environment and activate it:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install the dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Start the FastAPI server:
   ```
   uvicorn main:app --reload
   ```

   The API will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd sport-betting-mvp/frontend
   ```

2. Install the dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

   The app will be available at http://localhost:3000

## Authentication

The system uses a secure authentication system. To log in:

- Username: `Admin`
- Password: `Admin`

## How It Works

1. **Data Collection**: The system fetches odds data from bookmakers
2. **AI Prediction**: The ML model predicts win probabilities by analyzing historical data and current statistics
3. **Expected Value Calculation**: EV = (Predicted Probability × Bookmaker Odds) - 1
4. **Value Bet Identification**: Bets with positive EV are flagged as value bets
5. **User Notification**: Value bets trigger notifications to alert users of profitable opportunities

## User Interface

- **Login Screen**: Secure authentication
- **Dashboard**: Stats overview and bet analysis
- **Table View**: Detailed view of all analyzed bets
- **Chart View**: Visual representation of expected values
- **Notifications**: Real-time alerts for value bets

## API Endpoints

- **Health Check**: `GET /health`
- **Prediction**: `POST /predict`
  
  Request:
  ```json
  {
    "sport": "Football",
    "match_id": 101,
    "bookmaker_odds": 2.1
  }
  ```
  
  Response:
  ```json
  {
    "match_id": 101,
    "predicted_win_prob": 0.523,
    "bookmaker_odds": 2.1,
    "expected_value": 0.098,
    "value_bet": true
  }
  ```

## License

This project is for demonstration purposes only. 