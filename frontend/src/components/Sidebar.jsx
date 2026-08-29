import {
  LayoutDashboard,
  CreditCard,
  Users,
  BarChart3,
  Settings,
} from "lucide-react"

function Sidebar({ activeTab = "dashboard", setActiveTab }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-menu">

        <button
          className={`sidebar-item ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab && setActiveTab("dashboard")}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>

        <button
          className={`sidebar-item ${activeTab === "payments" ? "active" : ""}`}
          onClick={() => setActiveTab && setActiveTab("payments")}
        >
          <CreditCard size={20} />
          <span>Payments</span>
        </button>

        <button
          className={`sidebar-item ${activeTab === "customers" ? "active" : ""}`}
          onClick={() => setActiveTab && setActiveTab("customers")}
        >
          <Users size={20} />
          <span>Customers</span>
        </button>

        <button
          className={`sidebar-item ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab && setActiveTab("analytics")}
        >
          <BarChart3 size={20} />
          <span>Analytics</span>
        </button>

        <button
          className={`sidebar-item ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab && setActiveTab("settings")}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>

      </div>
    </aside>
  )
}

export default Sidebar