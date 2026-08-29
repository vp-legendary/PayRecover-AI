import { Bell, User } from "lucide-react"

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <h2>PayRecover AI</h2>
      </div>

      <div className="navbar-actions">
        <button className="icon-button">
          <Bell size={20} />
        </button>

        <button className="profile-button">
          <User size={20} />
          <span>Admin</span>
        </button>
      </div>
    </nav>
  )
}

export default Navbar