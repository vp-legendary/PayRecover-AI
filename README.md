# PayRecover-AI

**PayRecover-AI** is an AI-powered payment failure analysis and recovery system designed to help merchants understand failed payments, identify failure reasons, assess recovery risk, and determine the appropriate recovery action.

## 🚀 Features

* Payment failure analysis
* Failure reason identification
* Failure category classification
* Recoverability assessment
* Risk classification: LOW, MEDIUM, HIGH
* Intelligent recovery recommendations
* Retry eligibility and retry limits
* Escalation detection
* Payment dashboard
* Payment search and filtering
* Recovery statistics and visualization
* REST API with Swagger documentation

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* TypeScript
* Recharts

### Backend

* Python
* FastAPI
* SQLAlchemy
* Uvicorn

### Database

* SQLite for local development
* PostgreSQL for the deployed environment

---

## 📁 Project Structure

```text
PayRecover-AI/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── requirements.txt
│   └── payrecover.db
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── README.md
└── .gitignore
```

---

# 📋 Prerequisites

Before running the application, make sure the following are installed:

* Python 3.x
* Node.js
* npm
* Git

Check the installed versions:

```bash
python --version
node --version
npm --version
git --version
```

---

# ⚙️ Installation

## 1. Clone the Repository

Clone the GitHub repository:

```bash
git clone https://github.com/vp-legendary/PayRecover-AI.git
```

Move into the project directory:

```bash
cd PayRecover-AI
```

---

# 🔹 Backend Setup

Open a terminal and navigate to the backend:

```bash
cd backend
```

## 2. Create a Python Virtual Environment

Creating a virtual environment keeps the project's Python dependencies isolated from the system Python installation.

### Windows

```bash
python -m venv venv
```

Activate the virtual environment:

```bash
venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv venv
```

Activate the virtual environment:

```bash
source venv/bin/activate
```

After activation, the terminal should show the virtual environment name, usually:

```text
(venv)
```

## 3. Install Backend Dependencies

With the virtual environment activated:

```bash
pip install -r requirements.txt
```

## 4. Start the Backend

Run:

```bash
uvicorn main:app --reload
```

The FastAPI backend will run at:

```text
http://127.0.0.1:8000
```

---

# 📖 API Documentation

FastAPI automatically provides interactive Swagger documentation.

Open:

```text
http://127.0.0.1:8000/docs
```

The Swagger interface can be used to view and test the available API endpoints.

---

# 🔹 Frontend Setup

Keep the backend terminal running.

Open a **second terminal**.

From the project root, navigate to the frontend:

```bash
cd PayRecover-AI/frontend
```

If you are already inside the project directory, use:

```bash
cd frontend
```

## 5. Install Frontend Dependencies

```bash
npm install
```

## 6. Start the Frontend

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

Open the URL in your browser.

---

# ▶️ Running the Complete Application

The application requires **two terminals**.

## Terminal 1 — Backend

```bash
cd PayRecover-AI/backend
```

### Windows

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

---

## Terminal 2 — Frontend

```bash
cd PayRecover-AI/frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Make sure the backend is running before using the frontend.

---

# 🔄 Application Flow

```text
Failed Payment
       ↓
Payment Analysis
       ↓
Failure Reason Identification
       ↓
Category + Risk Assessment
       ↓
Recoverability Check
       ↓
Recovery Decision
       ↓
Retry / Customer Action / Escalation
       ↓
Recovery Tracking
```

---

# 🧠 Recovery Decision Logic

PayRecover-AI analyzes failed payment information and determines:

* Why the payment failed
* Failure category
* Whether the payment is recoverable
* Risk level
* Whether a retry is allowed
* Maximum retry attempts
* Whether escalation is required
* Recommended recovery action

### Example

```text
Payment Failed
      ↓
Bank Declined
      ↓
Category: BANK_ISSUE
      ↓
Risk: MEDIUM
      ↓
Recoverable: YES
      ↓
Retry Allowed: YES
      ↓
Recommended Action:
Retry after some time
```

---

# 🗄️ Database

### Local Development

The application uses SQLite for local development.

The local database file is:

```text
backend/payrecover.db
```

The application can use this local database when running on a developer's computer.

### Deployed Environment

The deployed backend uses PostgreSQL through the configured `DATABASE_URL` environment variable.

---

# 🌐 API Endpoints

## Analyze Payment

```text
POST /analyze-payment
```

Analyzes a failed payment and returns information such as:

* Failure reason
* Category
* Risk level
* Recoverability
* Retry policy
* Escalation requirements
* Recommended recovery action

## Payments

```text
POST /payments
```

Creates and stores payment information.

For the complete API specification, use the Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

---

# ⚠️ Important Notes

* The application uses **mock payment data for demonstration purposes**.
* Do not use real customer or payment information.
* The backend must be running before using the frontend.
* A Python virtual environment should be created and activated before installing backend dependencies.
* Local development uses SQLite.
* The deployed environment uses PostgreSQL.
* Make sure all required dependencies are installed before running the application.

---

# 👨‍💻 Project

**PayRecover-AI**

Built for the **Razorpay Buildathon 2026**.
