import { useState, useEffect } from "react"
import Navbar from "./components/Navbar"
import Sidebar from "./components/Sidebar"
import StatsCard from "./components/StatsCard"
import RecoveryChart from "./components/RecoveryChart"
import PaymentTable from "./components/PaymentTable"
import "./App.css"

function App() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [activeTab, setActiveTab] = useState("dashboard")

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${import.meta.env.VITE_API_URL}/payments`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      setPayments(data)
      setFetchError(null)
    } catch (err) {
      console.error("Error loading payments from database:", err)
      setFetchError("Unable to load payments from database. Please ensure FastAPI backend is running.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  // Dynamic Statistics Calculations (Case-Insensitive Status Check)
  const failedPayments = payments.length

  const recoveredPayments = payments.filter(
    (payment) => (payment.status || "").toLowerCase() === "recovered"
  ).length

  const recoveryRate =
    failedPayments > 0
      ? ((recoveredPayments / failedPayments) * 100).toFixed(1)
      : "0.0"

  const revenueRecovered = payments
    .filter((payment) => (payment.status || "").toLowerCase() === "recovered")
    .reduce((total, payment) => total + (Number(payment.amount) || 0), 0)

  // Derived Customer Summaries from Database Data
  const customerMap = payments.reduce((acc, p) => {
    const cust = p.customer || "Unknown Customer"
    if (!acc[cust]) {
      acc[cust] = {
        name: cust,
        totalSpent: 0,
        transactionCount: 0,
        recoveredCount: 0,
        methods: new Set(),
      }
    }
    acc[cust].totalSpent += Number(p.amount) || 0
    acc[cust].transactionCount += 1
    if ((p.status || "").toLowerCase() === "recovered") {
      acc[cust].recoveredCount += 1
    }
    if (p.method) acc[cust].methods.add(p.method)
    return acc
  }, {})

  const customersList = Object.values(customerMap)

  return (
    <>
      <Navbar />

      <div className="dashboard-layout">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="main-content">
          {fetchError && (
            <div className="analysis-error-banner">
              <span>{fetchError}</span>
              <button onClick={fetchPayments}>Retry</button>
            </div>
          )}

          {/* --- VIEW 1: DASHBOARD --- */}
          {activeTab === "dashboard" && (
            <>
              <h1>Dashboard</h1>
              <p className="dashboard-subtitle">
                Overview of your payment recovery performance (PostgreSQL Storage)
              </p>

              <div className="stats-grid">
                <StatsCard
                  title="Failed Payments"
                  value={loading ? "..." : failedPayments}
                  description="Requires attention"
                />

                <StatsCard
                  title="Recovered Payments"
                  value={loading ? "..." : recoveredPayments}
                  description="Successfully recovered"
                />

                <StatsCard
                  title="Recovery Rate"
                  value={loading ? "..." : `${recoveryRate}%`}
                  description="Overall recovery performance"
                />

                <StatsCard
                  title="Revenue Recovered"
                  value={loading ? "..." : `₹${revenueRecovered.toLocaleString("en-IN")}`}
                  description="Total recovered amount"
                />
              </div>

              <RecoveryChart payments={payments} />

              <PaymentTable
                payments={payments}
                setPayments={setPayments}
                refreshPayments={fetchPayments}
              />
            </>
          )}

          {/* --- VIEW 2: PAYMENTS --- */}
          {activeTab === "payments" && (
            <>
              <h1>Payment Records</h1>
              <p className="dashboard-subtitle">
                Manage and recover payment failures directly from PostgreSQL database
              </p>

              <PaymentTable
                payments={payments}
                setPayments={setPayments}
                refreshPayments={fetchPayments}
              />
            </>
          )}

          {/* --- VIEW 3: CUSTOMERS --- */}
          {activeTab === "customers" && (
            <>
              <h1>Customer Summary</h1>
              <p className="dashboard-subtitle">
                Customer transaction summaries derived from PostgreSQL database records
              </p>

              <div className="payment-card">
                <div className="payment-header">
                  <div>
                    <h2>Customers ({customersList.length})</h2>
                    <p>Summary of customer payment activity and failure history</p>
                  </div>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Total Volume</th>
                        <th>Transactions</th>
                        <th>Payment Methods</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customersList.length > 0 ? (
                        customersList.map((cust) => (
                          <tr key={cust.name}>
                            <td><strong>{cust.name}</strong></td>
                            <td>₹{cust.totalSpent.toLocaleString("en-IN")}</td>
                            <td>{cust.transactionCount} transaction(s)</td>
                            <td>{Array.from(cust.methods).join(", ") || "Card"}</td>
                            <td>
                              <span className={`status-badge ${cust.recoveredCount > 0 ? "recovered" : "pending"}`}>
                                {cust.recoveredCount > 0 ? "Active / Recovered" : "Pending Action"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5">No customer records found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* --- VIEW 4: ANALYTICS --- */}
          {activeTab === "analytics" && (
            <>
              <h1>Recovery Analytics</h1>
              <p className="dashboard-subtitle">
                In-depth breakdown of payment failure diagnosis and recovery metrics
              </p>

              <div className="stats-grid">
                <StatsCard
                  title="Failed Payments"
                  value={loading ? "..." : failedPayments}
                  description="Requires attention"
                />

                <StatsCard
                  title="Recovered Payments"
                  value={loading ? "..." : recoveredPayments}
                  description="Successfully recovered"
                />

                <StatsCard
                  title="Recovery Rate"
                  value={loading ? "..." : `${recoveryRate}%`}
                  description="Overall recovery performance"
                />

                <StatsCard
                  title="Revenue Recovered"
                  value={loading ? "..." : `₹${revenueRecovered.toLocaleString("en-IN")}`}
                  description="Total recovered amount"
                />
              </div>

              <RecoveryChart payments={payments} />
            </>
          )}

          {/* --- VIEW 5: SETTINGS --- */}
          {activeTab === "settings" && (
            <>
              <h1>System Settings</h1>
              <p className="dashboard-subtitle">
                PayRecover AI System Configuration & Rule Engine Status
              </p>

              <div className="payment-card" style={{ padding: "28px" }}>
                <h2>Engine & Database Status</h2>
                <div style={{ marginTop: "16px", lineHeight: "1.8", color: "#374151" }}>
                  <p><strong>Architecture:</strong> React Frontend + FastAPI REST Backend + SQLAlchemy ORM + PostgreSQL Database</p>
                  <p><strong>Diagnosis Engine:</strong> Intelligent Rule-Based Failure Categorization & Safety Policy Enforcer</p>

                  <p><strong>Database Connection:</strong> Operational (PostgreSQL / Persistent SQLite Fallback)</p>
                  <p><strong>CORS Policy:</strong> Configured for <code>http://localhost:5173</code></p>
                  <p><strong>Environment:</strong> Hackathon Demonstration Build v1.0.0</p>
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </>
  )
}

export default App