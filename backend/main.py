from typing import Any
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db, SessionLocal
from models import (
    PaymentDB,
    PaymentSchema,
    PaymentCreate,
    PaymentUpdate,
    PaymentResponse,
    compute_payment_decision
)

# Create database tables automatically on application startup
Base.metadata.create_all(bind=engine)

INITIAL_PAYMENTS = [
    {
        "transaction_id": "TXN1001",
        "customer": "Rahul Sharma",
        "amount": 2500.0,
        "method": "Card",
        "reason": "Card declined",
        "status": "Pending",
        "attempts": 0,
        "date": "24 Aug 2026",
        "recommended_action": "Retry payment",
        "explanation": "The card issuer declined the transaction. A retry may succeed if the decline was temporary."
    },
    {
        "transaction_id": "TXN1002",
        "customer": "Mrunal Pathak",
        "amount": 8500.0,
        "method": "Card",
        "reason": "Card declined",
        "status": "Pending",
        "attempts": 0,
        "date": "24 Aug 2026",
        "recommended_action": "Retry payment",
        "explanation": "The card issuer declined the transaction. A retry may succeed if the decline was temporary."
    },
    {
        "transaction_id": "TXN1003",
        "customer": "Priya Patil",
        "amount": 1200.0,
        "method": "UPI",
        "reason": "Insufficient funds",
        "status": "Pending",
        "attempts": 0,
        "date": "24 Aug 2026",
        "recommended_action": "Retry later",
        "explanation": "The customer's account may not have sufficient balance. Retrying later gives the customer time to add funds."
    },
    {
        "transaction_id": "TXN1004",
        "customer": "Amit Joshi",
        "amount": 4500.0,
        "method": "Net Banking",
        "reason": "Bank error",
        "status": "Pending",
        "attempts": 0,
        "date": "23 Aug 2026",
        "recommended_action": "Retry after delay",
        "explanation": "A temporary banking issue may have caused the failure. Retrying after a short delay may succeed."
    },
    {
        "transaction_id": "TXN1005",
        "customer": "Sneha Kulkarni",
        "amount": 3200.0,
        "method": "Card",
        "reason": "Card expired",
        "status": "Recovered",
        "attempts": 1,
        "date": "23 Aug 2026",
        "recommended_action": "Update card",
        "explanation": "The payment card has expired. The customer should update their payment method before another attempt."
    }
]


def seed_initial_data():
    """Seed initial sample payment records into database if empty or sanitize any legacy 'string' placeholders."""
    db = SessionLocal()
    try:
        count = db.query(PaymentDB).count()
        if count == 0:
            print("Database empty. Seeding initial sample payment records...")
            for p_data in INITIAL_PAYMENTS:
                db_payment = PaymentDB(**p_data)
                db.add(db_payment)
            db.commit()
            print("Database seeded successfully with sample payments.")
        else:
            # Sanitize legacy placeholder values ('string') if present
            string_records = db.query(PaymentDB).filter(
                (PaymentDB.reason == "string") | (PaymentDB.status == "string")
            ).all()
            if string_records:
                print("Sanitizing legacy placeholder rows in database...")
                for rec in string_records:
                    init_data = next((item for item in INITIAL_PAYMENTS if item["transaction_id"] == rec.transaction_id), None)
                    if init_data:
                        rec.reason = init_data["reason"]
                        rec.status = init_data["status"]
                        rec.attempts = init_data["attempts"]
                        rec.recommended_action = init_data["recommended_action"]
                        rec.explanation = init_data["explanation"]
                db.commit()
                print("Database sanitization complete.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()


# Ensure database initial data is seeded & sanitized on startup
seed_initial_data()

app = FastAPI(
    title="PayRecover AI API",
    description="Payment failure diagnosis and recovery system API with intelligent decision engine",
    version="1.0.0"
)

# Minimum required CORS configuration for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "PayRecover AI backend is running"}


@app.get("/payments", response_model=list[PaymentResponse])
def get_payments(db: Session = Depends(get_db)):
    """Fetch all payment records from database via SQLAlchemy."""
    payments = db.query(PaymentDB).all()
    return payments


@app.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(payment: PaymentCreate, db: Session = Depends(get_db)):
    """Create a new payment record in PostgreSQL."""
    existing = db.query(PaymentDB).filter(PaymentDB.transaction_id == payment.transaction_id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Payment with transaction_id '{payment.transaction_id}' already exists."
        )

    db_payment = PaymentDB(**payment.model_dump())
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


@app.patch("/payments/{transaction_id}", response_model=PaymentResponse)
def update_payment_status(transaction_id: str, update_data: PaymentUpdate | None = None, db: Session = Depends(get_db)):
    """Update payment status and automatically increment attempts in PostgreSQL."""
    db_payment = db.query(PaymentDB).filter(PaymentDB.transaction_id == transaction_id).first()
    if not db_payment:
        raise HTTPException(
            status_code=404,
            detail=f"Payment transaction '{transaction_id}' not found."
        )

    target_status = update_data.status if (update_data and update_data.status is not None) else "Recovered"

    # Validate recovery policy safety
    decision = compute_payment_decision(db_payment.reason, db_payment.attempts)
    print(f"[PATCH DEBUG] ID={transaction_id} | DB Reason='{db_payment.reason}' | DB Attempts={db_payment.attempts} | TargetStatus='{target_status}' | RetryAllowed={decision['retry_allowed']}")

    if target_status == "Recovered" and not decision["retry_allowed"]:
        print(f"[PATCH DEBUG] SAFETY BLOCKED: {decision['escalation_reason']}")
        raise HTTPException(
            status_code=400,
            detail=f"Recovery safety policy error: {decision['escalation_reason'] or 'Maximum retry limit reached.'}"
        )

    db_payment.status = target_status

    # Increment attempts automatically by +1 in backend if setting to Recovered or explicitly passing attempts
    if update_data and update_data.attempts is not None:
        db_payment.attempts = update_data.attempts
    elif target_status == "Recovered":
        db_payment.attempts = (db_payment.attempts or 0) + 1

    # Preserve existing fields unless explicitly provided with valid non-placeholder values
    if update_data:
        if update_data.reason and update_data.reason != "string":
            db_payment.reason = update_data.reason
        if update_data.recommended_action and update_data.recommended_action != "string":
            db_payment.recommended_action = update_data.recommended_action
        if update_data.explanation and update_data.explanation != "string":
            db_payment.explanation = update_data.explanation

    db.commit()
    db.refresh(db_payment)
    return db_payment


@app.post("/payments/analyze")
@app.post("/analyze-payment")
def analyze_payment(payment: PaymentSchema, db: Session = Depends(get_db)):
    """Rule-based decision engine analyzing failure reason, risk, retry limits, and escalation logic."""
    txn_id = payment.get_id()
    reason_input = payment.get_reason()
    attempts = payment.get_attempts()

    db_payment = db.query(PaymentDB).filter(PaymentDB.transaction_id == txn_id).first()
    if db_payment:
        attempts = db_payment.attempts
        if db_payment.reason and db_payment.reason != "Unknown":
            reason_input = db_payment.reason

    decision = compute_payment_decision(reason_input, attempts)

    if db_payment:
        db_payment.recommended_action = decision["recommended_action"]
        db_payment.explanation = decision["explanation"]
        db.commit()

    return {
        "transaction_id": txn_id,
        "customer": payment.customer,
        "amount": payment.amount,
        "reason": reason_input,
        "category": decision["category"],
        "recoverable": decision["recoverable"],
        "risk": decision["risk"],
        "recommendedAction": decision["recommended_action"],
        "recommended_action": decision["recommended_action"],
        "explanation": decision["explanation"],
        "attempts": attempts,
        "max_retries": decision["max_retries"],
        "retries_left": decision["retries_left"],
        "retry_allowed": decision["retry_allowed"],
        "escalation_required": decision["escalation_required"],
        "escalation_target": decision["escalation_target"],
        "escalation_reason": decision["escalation_reason"]
    }
