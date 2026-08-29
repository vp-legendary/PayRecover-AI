from typing import Any
from sqlalchemy import Column, Integer, String, Float
from database import Base
from pydantic import BaseModel, Field, ConfigDict, model_validator


# --- SQLAlchemy Database ORM Model ---
class PaymentDB(Base):
    """
    SQLAlchemy model representing the 'payments' table in PostgreSQL.
    Stores numerical amount, customer details, failure reasons, and recovery status.
    """
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transaction_id = Column(String, unique=True, index=True, nullable=False)
    customer = Column(String, nullable=False)
    amount = Column(Float, nullable=False)  # Numeric only - no currency symbols stored
    method = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    status = Column(String, default="Pending", nullable=False)
    attempts = Column(Integer, default=1, nullable=False)
    date = Column(String, nullable=False)
    recommended_action = Column(String, nullable=True)
    explanation = Column(String, nullable=True)


# --- Helper Function for Decision Engine Categorization ---
def compute_payment_decision(reason: str, attempts: int):
    """
    Core Rule-Based Decision Engine:
    Categorizes failure reason, computes recoverable status, risk level,
    retry allowance, max retry limits, and escalation targets.
    """
    reason_lower = (reason or "").lower()

    if "card declined" in reason_lower or "bank_declined" in reason_lower:
        category = "BANK_ISSUE"
        recoverable = True
        risk = "MEDIUM"
        rec_action = "Retry payment"
        explanation = "The card issuer declined the transaction. A retry may succeed if the decline was temporary."
        max_retries = 1

    elif "insufficient funds" in reason_lower:
        category = "CUSTOMER_ACTION_REQUIRED"
        recoverable = True
        risk = "LOW"
        rec_action = "Retry later"
        explanation = "The customer's account may not have sufficient balance. Retrying later gives the customer time to add funds."
        max_retries = 2

    elif "bank error" in reason_lower or "network" in reason_lower or "timeout" in reason_lower:
        category = "TEMPORARY"
        recoverable = True
        risk = "LOW"
        rec_action = "Retry after delay"
        explanation = "A temporary banking issue or network timeout interrupted the transaction. Retrying after a short delay may succeed."
        max_retries = 2

    elif "card expired" in reason_lower or "expired" in reason_lower:
        category = "PAYMENT_METHOD_ISSUE"
        recoverable = False
        risk = "LOW"
        rec_action = "Update card"
        explanation = "The payment card has expired. The customer must update their payment method before another recovery attempt."
        max_retries = 0

    else:
        category = "UNKNOWN"
        recoverable = False
        risk = "HIGH"
        rec_action = "Review payment"
        explanation = "The payment failure could not be automatically resolved. Escalation to merchant support is required for manual review."
        max_retries = 0

    retry_allowed = recoverable and (attempts < max_retries)
    retries_left = max(0, max_retries - attempts) if retry_allowed else 0

    escalation_required = (not retry_allowed) or (not recoverable) or (risk == "HIGH")
    escalation_target = None
    escalation_reason = None

    if escalation_required:
        if risk == "HIGH" or category == "UNKNOWN":
            escalation_target = "MERCHANT_SUPPORT"
            escalation_reason = "High-risk failure requires manual review by merchant support."
        elif category == "BANK_ISSUE":
            escalation_target = "BANK"
            escalation_reason = f"Bank-related failure persisted after {attempts} retry attempt(s). Escalate to issuing bank."
        elif category == "TEMPORARY":
            escalation_target = "PAYMENT_GATEWAY"
            escalation_reason = f"Temporary bank/network error exceeded maximum retries ({max_retries}). Gateway review required."
        elif category in ["CUSTOMER_ACTION_REQUIRED", "PAYMENT_METHOD_ISSUE"]:
            escalation_target = "CUSTOMER"
            escalation_reason = "Payment recovery requires direct customer intervention or payment method update."

    return {
        "category": category,
        "recoverable": recoverable,
        "risk": risk,
        "recommended_action": rec_action,
        "explanation": explanation,
        "max_retries": max_retries,
        "retries_left": retries_left,
        "retry_allowed": retry_allowed,
        "escalation_required": escalation_required,
        "escalation_target": escalation_target,
        "escalation_reason": escalation_reason
    }


# --- Pydantic API Schemas ---
class PaymentSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str | None = Field(default=None, alias="transaction_id")
    transaction_id: str | None = None
    payment_id: str | None = None

    customer: str | None = "Unknown Customer"
    amount: float
    currency: str = "INR"

    method: str | None = Field(default="Card", alias="payment_method")
    payment_method: str | None = None

    reason: str | None = Field(default=None, alias="error_code")
    error_code: str | None = None
    error_message: str | None = None

    status: str = "Pending"
    attempts: int = Field(default=0, alias="retry_count")
    retry_count: int = 0
    date: str | None = "24 Aug 2026"

    def get_id(self) -> str:
        return self.transaction_id or self.id or self.payment_id or "TXN_UNKNOWN"

    def get_method(self) -> str:
        return self.method or self.payment_method or "Card"

    def get_reason(self) -> str:
        return self.reason or self.error_code or self.error_message or "Unknown"

    def get_attempts(self) -> int:
        return self.attempts if self.attempts is not None else self.retry_count


class PaymentCreate(BaseModel):
    transaction_id: str
    customer: str
    amount: float
    method: str
    reason: str
    status: str = "Pending"
    attempts: int = 0
    date: str = "24 Aug 2026"
    recommended_action: str | None = None
    explanation: str | None = None


class PaymentUpdate(BaseModel):
    status: str | None = None
    attempts: int | None = None
    reason: str | None = None
    recommended_action: str | None = None
    explanation: str | None = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    transaction_id: str
    customer: str
    amount: float
    method: str
    reason: str
    category: str = "BANK_ISSUE"
    recoverable: bool = True
    risk: str = "LOW"
    recommendedAction: str | None = Field(default=None, alias="recommended_action")
    recommended_action: str | None = None
    explanation: str | None = None
    status: str
    attempts: int = 0
    max_retries: int = 2
    retries_left: int = 2
    retry_allowed: bool = True
    escalation_required: bool = False
    escalation_target: str | None = None
    escalation_reason: str | None = None
    date: str

    @model_validator(mode="before")
    @classmethod
    def map_db_model(cls, data: Any) -> Any:
        if isinstance(data, dict):
            txn = data.get("transaction_id") or data.get("id") or ""
            rec = data.get("recommendedAction") or data.get("recommended_action") or ""
            attempts = data.get("attempts", 0)
            reason = data.get("reason", "")

            decision = compute_payment_decision(reason, attempts)

            data["id"] = txn
            data["transaction_id"] = txn
            data["recommendedAction"] = rec or decision["recommended_action"]
            data["recommended_action"] = rec or decision["recommended_action"]
            data["explanation"] = data.get("explanation") or decision["explanation"]
            data["category"] = data.get("category") or decision["category"]
            data["recoverable"] = decision["recoverable"] if "recoverable" not in data else data["recoverable"]
            data["risk"] = data.get("risk") or decision["risk"]
            data["max_retries"] = decision["max_retries"]
            data["retries_left"] = decision["retries_left"]
            data["retry_allowed"] = decision["retry_allowed"]
            data["escalation_required"] = decision["escalation_required"]
            data["escalation_target"] = decision["escalation_target"]
            data["escalation_reason"] = decision["escalation_reason"]
            return data

        if hasattr(data, "transaction_id"):
            txn = getattr(data, "transaction_id")
            attempts = getattr(data, "attempts", 0)
            reason = getattr(data, "reason", "")
            rec = getattr(data, "recommended_action", None)
            exp = getattr(data, "explanation", None)

            decision = compute_payment_decision(reason, attempts)

            return {
                "id": txn,
                "transaction_id": txn,
                "customer": getattr(data, "customer", ""),
                "amount": getattr(data, "amount", 0.0),
                "method": getattr(data, "method", "Card"),
                "reason": reason,
                "category": decision["category"],
                "recoverable": decision["recoverable"],
                "risk": decision["risk"],
                "recommendedAction": rec or decision["recommended_action"],
                "recommended_action": rec or decision["recommended_action"],
                "explanation": exp or decision["explanation"],
                "status": getattr(data, "status", "Pending"),
                "attempts": attempts,
                "max_retries": decision["max_retries"],
                "retries_left": decision["retries_left"],
                "retry_allowed": decision["retry_allowed"],
                "escalation_required": decision["escalation_required"],
                "escalation_target": decision["escalation_target"],
                "escalation_reason": decision["escalation_reason"],
                "date": getattr(data, "date", "24 Aug 2026"),
            }
        return data
