import { useState } from "react"

function PaymentTable({ payments, setPayments, refreshPayments }) {

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [reasonFilter, setReasonFilter] = useState("All")

  const [selectedPayment, setSelectedPayment] = useState(null)
  const [analyzingId, setAnalyzingId] = useState(null)
  const [analysisError, setAnalysisError] = useState(null)

  // Helper to extract canonical payment identifier safely
  const getPaymentId = (payment) => {
    if (!payment) return ""
    return payment.id || payment.transaction_id || ""
  }

  const handleResetFilters = () => {
    setSearchTerm("")
    setStatusFilter("All")
    setReasonFilter("All")
  }

  const filteredPayments = payments.filter((payment) => {

    const matchesSearch = (payment.customer || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === "All" ||
      payment.status === statusFilter

    const matchesReason =
      reasonFilter === "All" ||
      payment.reason === reasonFilter

    return matchesSearch && matchesStatus && matchesReason
  })

  const recoverPayment = async (payment) => {
    const paymentId = getPaymentId(payment)

    if (payment.status === "Recovered" || analyzingId !== null || !paymentId) {
      return
    }

    setAnalyzingId(paymentId)
    setAnalysisError(null)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_id: paymentId,
          customer: payment.customer,
          amount: payment.amount,
          method: payment.method,
          reason: payment.reason,
          attempts: payment.attempts,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      setSelectedPayment({
        ...payment,
        id: paymentId,
        transaction_id: paymentId,
        reason: data.reason || payment.reason,
        category: data.category || payment.category || "BANK_ISSUE",
        recoverable: data.recoverable !== undefined ? data.recoverable : true,
        risk: data.risk || payment.risk || "LOW",
        recommended_action: data.recommended_action || data.recommendedAction || "Review payment",
        recommendedAction: data.recommended_action || data.recommendedAction || "Review payment",
        explanation: data.explanation || "No explanation provided.",
        attempts: data.attempts !== undefined ? data.attempts : payment.attempts,
        max_retries: data.max_retries !== undefined ? data.max_retries : 2,
        retries_left: data.retries_left !== undefined ? data.retries_left : 2,
        retry_allowed: data.retry_allowed !== undefined ? data.retry_allowed : true,
        escalation_required: data.escalation_required || false,
        escalation_target: data.escalation_target || null,
        escalation_reason: data.escalation_reason || null,
      })
    } catch (err) {
      console.error("Payment analysis error:", err)
      setAnalysisError("Unable to analyze payment. Please try again.")
    } finally {
      setAnalyzingId(null)
    }
  }

  const confirmRecovery = async () => {
    const paymentId = getPaymentId(selectedPayment)

    if (
      !selectedPayment ||
      selectedPayment.status === "Recovered" ||
      !paymentId ||
      selectedPayment.retry_allowed === false ||
      selectedPayment.recoverable === false
    ) {
      return
    }

    try {
      const patchUrl = `${import.meta.env.VITE_API_URL}/payments/${paymentId}`
      const response = await fetch(
        patchUrl,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "Recovered",
            recommended_action: selectedPayment.recommended_action || selectedPayment.recommendedAction,
            explanation: selectedPayment.explanation,
          }),
        }
      )

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.detail || `HTTP error! status: ${response.status}`)
      }

      // Re-fetch database payments to ensure PostgreSQL is source of truth
      if (refreshPayments) {
        await refreshPayments()
      } else {
        const updated = await response.json()
        const updatedId = getPaymentId(updated)
        setPayments((currentPayments) =>
          currentPayments.map((p) => (getPaymentId(p) === updatedId ? updated : p))
        )
      }
    } catch (err) {
      console.error("Failed to update payment in database:", err)
      setAnalysisError(err.message || "Failed to update payment status in database. Please try again.")
    } finally {
      setSelectedPayment(null)
    }
  }

  const cancelRecovery = () => {
    setSelectedPayment(null)
  }

  return (
    <div className="payment-card">

      {analysisError && (
        <div className="analysis-error-banner">
          <span>{analysisError}</span>
          <button onClick={() => setAnalysisError(null)}>×</button>
        </div>
      )}

      <div className="payment-header">

        <div>

          <h2>Failed Payments</h2>

          <p>
            Recent payment failures requiring recovery
          </p>

        </div>

        <div className="payment-actions">

          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            className="search-input"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >

            <option value="All">
              All Status
            </option>

            <option value="Pending">
              Pending
            </option>

            <option value="Recovered">
              Recovered
            </option>

          </select>

          <select
            value={reasonFilter}
            onChange={(event) =>
              setReasonFilter(event.target.value)
            }
          >

            <option value="All">
              All Reasons
            </option>

            <option value="Card declined">
              Card declined
            </option>

            <option value="Insufficient funds">
              Insufficient funds
            </option>

            <option value="Bank error">
              Bank error
            </option>

            <option value="Card expired">
              Card expired
            </option>

          </select>

          <button
            className="view-all-button"
            onClick={handleResetFilters}
          >
            View All
          </button>

        </div>

      </div>

      <div className="table-container">

        <table>

          <thead>

            <tr>
              <th>Customer</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>Recommended Action</th>
              <th>Status</th>
              <th>Action</th>
            </tr>

          </thead>

          <tbody>

            {filteredPayments.length > 0 ? (

              filteredPayments.map((payment) => {
                const currentId = getPaymentId(payment)
                const recAction = payment.recommended_action || payment.recommendedAction
                return (
                  <tr key={currentId || payment.customer}>

                    <td>
                      {payment.customer}
                    </td>

                    <td>
                      ₹{payment.amount.toLocaleString("en-IN")}
                    </td>

                    <td>
                      {payment.reason}
                    </td>

                    <td>
                      {recAction}
                    </td>

                    <td>

                      <span className={`status-badge ${payment.status.toLowerCase()}`}>
                        {payment.status}
                      </span>

                    </td>

                    <td>

                      <button
                        className={`recover-button ${analyzingId === currentId ? "analyzing" : ""}`}
                        onClick={() =>
                          recoverPayment(payment)
                        }
                        disabled={
                          payment.status === "Recovered" || analyzingId !== null
                        }
                      >

                        {payment.status === "Recovered"
                          ? "Recovered"
                          : analyzingId === currentId
                          ? "Analyzing..."
                          : "Recover"}

                      </button>

                    </td>

                  </tr>
                )
              })

            ) : (

              <tr>

                <td colSpan="6">
                  No payments found
                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>

      {selectedPayment && (

        <div className="recovery-overlay">

          <div className="recovery-modal">

            <div className="modal-header">
              <h2>
                Intelligent Recovery Decision Engine
              </h2>

              <p className="modal-subtitle">
                PayRecover AI analyzed this failed payment and computed recovery policy rules.
              </p>
            </div>

            <div className="modal-body">
              <div className="recovery-details">

                <div>
                  <strong>Customer</strong>
                  <p>{selectedPayment.customer}</p>
                </div>

                <div>
                  <strong>Amount</strong>
                  <p>₹{selectedPayment.amount.toLocaleString("en-IN")}</p>
                </div>

                <div>
                  <strong>Failure Reason</strong>
                  <p>{selectedPayment.reason}</p>
                </div>

                <div>
                  <strong>Category</strong>
                  <p className="category-tag">{selectedPayment.category || "BANK_ISSUE"}</p>
                </div>

                <div>
                  <strong>Risk Level</strong>
                  <p>
                    <span className={`risk-badge ${(selectedPayment.risk || "LOW").toLowerCase()}`}>
                      {selectedPayment.risk || "LOW"} RISK
                    </span>
                  </p>
                </div>

                <div>
                  <strong>Retry Policy</strong>
                  <p>
                    {selectedPayment.retry_allowed
                      ? `${selectedPayment.retries_left ?? (selectedPayment.max_retries - selectedPayment.attempts)} remaining (Max ${selectedPayment.max_retries ?? 2})`
                      : `Limit reached (${selectedPayment.attempts}/${selectedPayment.max_retries ?? 2})`}
                  </p>
                </div>

                <div className="full-width-detail">
                  <strong>Recommended Action</strong>
                  <p className="recommendation">
                    {selectedPayment.recommended_action || selectedPayment.recommendedAction}
                  </p>
                </div>

              </div>

              <div className="recovery-explanation">
                <strong>Why this action?</strong>
                <p>{selectedPayment.explanation}</p>
              </div>

              {selectedPayment.escalation_required && (
                <div className="escalation-warning-box">
                  <strong>Escalation Required ➔ {selectedPayment.escalation_target}</strong>
                  <p>{selectedPayment.escalation_reason || "Payment retry limit exceeded or manual intervention needed."}</p>
                </div>
              )}

              {(!selectedPayment.retry_allowed || !selectedPayment.recoverable) && (
                <div className="safety-warning-banner">
                  <span>⚠️ Automatic recovery is not allowed because maximum retries have been reached or customer action is required.</span>
                </div>
              )}
            </div>

            <div className="modal-actions">

              <button
                className="cancel-button"
                onClick={cancelRecovery}
              >
                Cancel
              </button>

              <button
                className="confirm-recovery-button"
                onClick={confirmRecovery}
                disabled={!selectedPayment.retry_allowed || !selectedPayment.recoverable}
              >
                {selectedPayment.retry_allowed && selectedPayment.recoverable
                  ? "Confirm Recovery"
                  : "Recovery Unavailable"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}

export default PaymentTable