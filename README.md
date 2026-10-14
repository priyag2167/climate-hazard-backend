# Climate Hazard Trend Analyzer

A full-stack climate data application that ingests, caches, analyzes, and visualizes historical weather data and long-term hazard trends (heatwaves & extreme events) using **FastAPI (Python)**, **MongoDB NoSQL database**, and **React (TypeScript) with Leaflet and Chart.js**.

Built for the **Case Study: Climate Hazard Trend Analyzer** (Full-Stack Developer role at Dygnify Ventures Pvt Ltd).

---

## 🌟 Features Implemented (Core & Bonus Challenges)

### 1. Geographic Region Selection
- **Preconfigured Regions**: Metros & cities (Delhi, Mumbai, Bengaluru, Chennai, Jaipur, Kolkata, Hyderabad, Ahmedabad, Lucknow, Pune), State centroids (Rajasthan, Maharashtra, Gujarat, Karnataka, Punjab), and International reference points (New York, London, Tokyo, Sydney).
- **Custom Coordinates**: Specify any arbitrary latitude & longitude with automatic local timezone resolution via Open-Meteo.
- **Custom Bounding Box**: Specify `min_lat`, `max_lat`, `min_lon`, and `max_lon`; computes area centroid and renders geographic boundaries.
- **Interactive Leaflet Map (Bonus Challenge 1)**: Visual map with click-to-pin, marker dragging, bounding box rectangle rendering, and automatic coordinate synchronization.

### 2. Hazard Detection Logic (Climatological Standards)
- **Heatwave (Selected by Default)**: Defined as **3+ consecutive calendar days** where daily maximum temperature strictly exceeds the **95th percentile** threshold calculated over the fixed reference baseline period (**1961–1990**).
- **Baseline Quality Gates**: Requires ≥ 95% total daily observations and ≥ 90% completeness in every baseline month to accept threshold estimation.
- **Reporting Quality Gates**: Years with < 95% daily coverage are flagged as unusable and excluded from trend series (never silently converted to zero).
- **Cleaning & Noise Handling**: Outlier bounding (-100°C to 65°C), duplicate resolution, missing day accounting, and gap disclosures.

### 3. Trend Detection Techniques (Bonus Challenge 3)
- **Descriptive Linear Regression (OLS)**: Computes decadal slopes (days/decade, events/decade) and coefficient of determination ($R^2$).
- **Mann-Kendall Non-Parametric Trend Test**: Implements the rank-based Mann-Kendall monotonic trend test ($S$ statistic, variance of $S$ with tie correction, $Z$ score, Kendall's Tau $\tau$, and two-tailed $p$-value at $\alpha=0.05$) to determine whether trends are statistically significant.
- **5-Year Trailing Moving Average**: Smooths annual inter-annual variability without bridging excluded missing years.

### 4. Interactive Visualizations & Insights
- **Executive Summary Insight Banner**: Prominently displays plain-English narrative (e.g. *"Heatwaves have increased by 40% in this region since 1990"*), comparing first 5-year vs. last 5-year mean frequency.
- **Interactive Chart.js Plots**: Toggles between Heatwave Days, Event Starts, Longest Run Duration, and Peak Excess with linear regression line and rolling average overlays.
- **Export Capabilities (Bonus Challenge 2)**:
  - **PDF Export**: Generates a high-resolution, branded PDF report containing the executive summary, stat cards, Mann-Kendall statistics, interactive charts, and data tables.
  - **CSV Export**: Downloads a complete, analysis-ready CSV dataset with all annual metrics, quality flags, and statistical indicators.

### 5. High-Performance MongoDB Caching & Rate-Limiting
- **Weather Chunk Cache**: Stores 5-year aligned raw daily weather blocks for 90 days with TTL indexes. Overlapping year queries reuse stored chunks.
- **Analysis Result Cache**: Full analysis documents cached for 7 days keyed by versioned hash (`ANALYSIS_VERSION = "climate-hazard-2.1-mk"`).
- **Application Throttling**: MongoDB-backed rate limiters (20 req/min per IP, 200 req/min global, cold analysis quotas) and process concurrency controls.

---

## 🛠️ Architecture & Tech Stack

```text
React (TypeScript + Leaflet + Chart.js)
          │
          │ HTTP / REST (/api/analysis, /api/regions, /api/analysis.csv)
          ▼
FastAPI (Python 3.13 / 3.14)
  ├── WeatherProvider  ───► Open-Meteo Archive API (ERA5 Reanalysis)
  ├── Analysis Engine  ───► NumPy / Pandas (Percentiles, Run Detection, Mann-Kendall, OLS)
  └── MongoStore       ───► MongoDB (Weather chunks, analyses, rate limits)
```

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.10+ (with virtualenv)
- Node.js 18+ and npm
- Local MongoDB running on `localhost:27017` (e.g. via Homebrew: `brew services start mongodb-community` or Docker)

### 1. Start MongoDB & Backend
```bash
# Clone the repository
git clone <your-repo-url>
cd climate-hazard-starter

# Setup Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run Unit & API Tests
PYTHONPATH=. pytest tests -v

# Start FastAPI Server
uvicorn app.main:app --reload --port 8000
```

Verify backend health:
- `http://localhost:8000/api/health` -> `{"status": "ok", "version": "2.1.0"}`
- `http://localhost:8000/docs` (Swagger UI)

### 2. Start Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## ☁️ Live Python Backend & Live Database Deployment Guide

To deploy this application for the case study submission:

### Part 1: Live NoSQL Database (MongoDB Atlas Free Tier M0)

1. **Sign up / Log in to MongoDB Atlas**:
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and register a free account.
2. **Create a Free Cluster**:
   - Select **Deploy a database** -> Choose **M0 Free Tier**.
   - Select a cloud provider (AWS or Google Cloud) and region near your users (e.g. `ap-south-1` Mumbai or `us-east-1`).
   - Cluster Name: `climate-cluster` (or default `Cluster0`). Click **Create**.
3. **Configure Database Security & Access**:
   - **Database Access**: Click **Database Access** under Security -> **Add New Database User**.
     - Authentication Method: Password.
     - Username: `climate_user`
     - Password: `<secure-password>` (e.g., `ClimateSafe2026!`)
     - Database User Privileges: `Read and write to any database`.
   - **Network Access**: Click **Network Access** under Security -> **Add IP Address**.
     - Choose **Allow Access from Anywhere** (`0.0.0.0/0`) so that cloud hosting services (Render, Railway, etc.) can connect.
4. **Get the Connection URI**:
   - Go to **Database Deployments** -> Click **Connect** -> **Drivers** (Python 3.12+).
   - Copy the connection string:
     ```text
     mongodb+srv://climate_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual database user password.

---

### Part 2: Live Python Backend Deployment (Render Free Web Service)

1. **Push your code to GitHub**:
   - Make sure your repository is public or connected to Render.
2. **Create a New Web Service on Render**:
   - Log into [render.com](https://render.com).
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository.
3. **Configure the Web Service Settings**:
   - **Name**: `climate-hazard-api`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Region**: Choose the region closest to your MongoDB Atlas cluster (e.g., Singapore or Oregon).
   - **Build Command**:
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
     ```
   - **Instance Type**: `Free`.
4. **Add Environment Variables**:
   In the Render dashboard under **Environment Variables**, add:
   - `MONGODB_URI`: `mongodb+srv://climate_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - `MONGODB_DATABASE`: `climate_hazard`
   - `ALLOWED_ORIGINS`: `https://<your-frontend-app>.vercel.app,http://localhost:5173` (update once frontend is deployed)
5. **Deploy**:
   - Click **Create Web Service**. Once deployed, note down your backend URL:
     `https://climate-hazard-api.onrender.com`
   - Test `https://climate-hazard-api.onrender.com/api/health` in your browser.

---

### Part 3: Live Frontend Deployment (Vercel)

1. **Log into Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
   - Import your GitHub repository.
2. **Configure Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit and select `frontend`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Add Environment Variable**:
   - Add `VITE_API_BASE_URL`:
     ```text
     https://climate-hazard-api.onrender.com
     ```
     *(Use your Render backend URL without trailing slash).*
4. **Deploy**:
   - Click **Deploy**. Vercel will build and launch your live web app.
   - Go back to your Render backend dashboard and add your Vercel URL to `ALLOWED_ORIGINS` to allow cross-origin requests.

---

## 🧪 Verification & Test Coverage

All 15 automated Python tests pass:
- `test_normalise_daily_handles_outliers_and_duplicates` (data cleaning, missingness, -100 to 65 C bounds).
- `test_detect_heatwaves_requires_consecutive_days` (3+ consecutive day run detection).
- `test_linear_trend_calculation` (ordinary least squares regression per decade).
- `test_mann_kendall_test_significant_increasing_trend` (Mann-Kendall $S$, tie handling, $Z$, $p$-value).
- `test_mann_kendall_test_no_trend` (null hypothesis test for stable series).
- `test_compare_periods` (first 5-year vs last 5-year comparison).
- `test_resolve_region` (cities, states, custom lat/lon points, bounding boxes).
- `test_api_health`, `test_api_regions`, `test_api_analysis_preconfigured_region`, `test_api_analysis_custom_coordinates`, `test_api_analysis_bounding_box`, `test_api_analysis_csv_export`, `test_api_invalid_year_range`, `test_api_invalid_coordinates`.

Run tests locally:
```bash
cd backend
PYTHONPATH=. pytest tests -v
```

---

## 📝 Assumptions & Methodological Notes

- **Baseline Definition**: 1961–1990 fixed reference climatology independently of reporting range.
- **Threshold**: 95th percentile of daily maximum temperatures during baseline, computed using NumPy's linear quantile method.
- **Run Definition**: 3+ consecutive calendar days strictly greater than the threshold. Consecutive hot days form one single event.
- **Coverage Rules**: Years with < 95% overall daily observations or < 90% in any calendar month are excluded from trend calculations rather than imputed as zero.
- **Statistical Interpretation**: Trends are descriptive indicators from ECMWF ERA5 reanalysis; not causal attributions or weather forecasts.

---

## 🤖 AI Tools Used & Disclosure

- **Claude / Gemini (Antigravity)** was utilized during development for:
  - Architecture refinement, implementing the Mann-Kendall non-parametric statistical algorithm with tie correction.
  - Designing the interactive Leaflet map integration and bounding box centroid calculations.
  - Integrating `jsPDF` and `html2canvas` for client-side PDF report exports.
  - Constructing automated `pytest` test suites and drafting the live deployment walkthrough.
- All code, mathematical calculations, and API routes were independently reviewed, executed, and verified against the live Open-Meteo API and MongoDB database.
