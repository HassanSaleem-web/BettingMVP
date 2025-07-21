# AI Sports Betting System - Usage Guide

This document provides detailed instructions on how to run and use the AI Sports Betting System.

## Setup and Installation

### Prerequisites
- Node.js (v14 or later)
- npm (v6 or later)
- Python (v3.8 or later)
- pip (for Python package management)

### Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```
   cd sport-betting-mvp/backend
   ```

2. Create a virtual environment (recommended):
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - On Windows:
     ```
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```
     source venv/bin/activate
     ```

4. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Start the FastAPI server:
   ```
   uvicorn main:app --reload
   ```

   The backend will run on http://localhost:8000

### Frontend Setup

1. Open a new terminal window and navigate to the frontend directory:
   ```
   cd sport-betting-mvp/frontend
   ```

2. Install the required npm packages:
   ```
   npm install
   ```

3. Start the React development server:
   ```
   npm start
   ```

   The frontend will be available at http://localhost:3000

## Using the Application

### Login
1. When you first open the application at http://localhost:3000, you'll see a login screen.
2. Use the following credentials to log in:
   - Username: `Admin`
   - Password: `Admin`

### Dashboard Overview
After logging in, you'll see the main dashboard with the following elements:

1. **Header** - Contains the application title and a logout button
2. **Stats Summary** - Shows key metrics:
   - Total bets analyzed
   - Number of value bets found (with percentage)
   - Average Expected Value (EV) for value bets

3. **View Toggle** - Buttons to switch between Table View and Chart View

### Table View
The default view shows all analyzed bets in a table format with the following columns:
- Match ID
- Sport
- Teams
- Bookmaker Odds
- Predicted Win Probability
- Expected Value (EV)
- Value Bet indicator (Yes/No)

Value bets (positive EV) are highlighted in green.

### Chart View
Switch to Chart View to see a bar chart visualization of the Expected Value for each bet:
- Green bars represent positive EV (value bets)
- Red bars represent negative EV (not recommended bets)
- Hover over bars to see detailed information about each bet

### Notifications
When value bets are detected, notifications will appear in the bottom-right corner of the screen. These notifications will automatically disappear after a few seconds.

### How It Works Section
The application includes an informational section explaining the three main steps of the AI betting process:
1. Data Collection
2. AI Prediction
3. Value Detection

## Backend API Endpoints

If you need to interact with the backend API directly:

- **Health Check**: `GET http://localhost:8000/health`
- **Prediction**: `POST http://localhost:8000/predict`
  - Request body example:
    ```json
    {
      "sport": "Football",
      "match_id": 101,
      "bookmaker_odds": 2.1
    }
    ```
  - Response example:
    ```json
    {
      "match_id": 101,
      "predicted_win_prob": 0.523,
      "bookmaker_odds": 2.1,
      "expected_value": 0.098,
      "value_bet": true
    }
    ```

## Troubleshooting

### Common Issues

1. **Backend connection errors**:
   - Ensure the FastAPI server is running on port 8000
   - Check if there are any CORS issues in the browser console

2. **Frontend not loading data**:
   - Verify that the sample_odds.json file exists in the frontend/public/data directory
   - Check browser console for network errors

3. **Login issues**:
   - Make sure to use exactly "Admin" for both username and password (case-sensitive)

4. **Chart not displaying**:
   - Ensure chart.js is properly installed
   - Check if there are any console errors related to the chart rendering

### Support

For additional help or to report issues, please contact the system administrator. 