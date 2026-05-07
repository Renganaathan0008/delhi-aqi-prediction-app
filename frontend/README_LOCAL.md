# Delhi AQI Tracker — Local Setup Guide

## Prerequisites
- Node.js v18+ 
- npm or yarn

## Setup Steps

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill env file
cp .env.example .env
# Edit .env with your Base44 app credentials

# 3. Start dev server
npm run dev
```

App will run at: http://localhost:5173

## Project Structure
```
src/
├── pages/
│   ├── Dashboard.jsx       # Live AQI overview
│   ├── PredictAQI.jsx      # LLM-powered prediction
│   ├── Trends.jsx          # Historical charts
│   ├── Stations.jsx        # Station comparison
│   ├── Alerts.jsx          # Alert management
│   └── AdminUpload.jsx     # CSV data upload
├── utils/
│   ├── aqi.js              # AQI helpers + simulatePrediction
│   └── llmPredict.js       # LLM prediction engine
├── lib/
│   └── AuthContext.jsx     # Auth state management
└── components/
    └── aqi/                # AQI-specific UI components

entities/
├── AQIRecord               # Historical sensor data
├── Prediction              # Saved LLM predictions
└── Alert                   # Admin-managed alerts
```

## Bugs Fixed (v1.1)
1. AuthContext — removed undefined `createAxiosClient` crash
2. PredictAQI — added try/catch/finally to predict()
3. Dashboard — load() now async, awaits alert fetch
4. AdminUpload — try/catch around bulkCreate loop
5. llmPredict — uses LLM category instead of re-deriving
6. aqi.js — SHAP values now sum correctly to aqi - baseAqi
7. AdminUpload — validates required CSV columns before upload
8. Alerts — removed dead imports
9. Stations — removed unused `sd` variable
10. Trends — removed unused `getAQIColor` import
