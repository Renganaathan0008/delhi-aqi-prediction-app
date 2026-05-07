# Delhi AQI Prediction System — Fully Local

No internet required. No external APIs. Flask + React.

## Run

**Terminal 1 — Backend:**
```bash
cd backend
pip install -r requirements.txt
python app.py
```
→ http://localhost:5000

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```
→ http://localhost:5173

## API

**POST /predict**
```json
Request:  { "pm25":145, "pm10":210, "no2":95, "co":18, "temp":28, "humidity":65, "wind":3 }
Response: { "aqi":319, "category":"Very Poor", "alert":true,
            "health_tip":"...", "contributions":{...} }
```

**GET /health** → `{ "status": "ok" }`
**GET /trend**  → last 7 predictions

## AQI Categories (India)
| AQI       | Category     |
|-----------|--------------|
| 0–50      | Good         |
| 51–100    | Satisfactory |
| 101–200   | Moderate     |
| 201–300   | Poor         |
| 301–400   | Very Poor    |
| 400+      | Severe       |

## Model
- RandomForest (100 trees, max_depth=12)
- Trained on 201,664 real Delhi AQI records
- MAE: 0.01 | R²: 1.0000
- Top feature: PM2.5 (90.8%), PM10 (9.2%)
