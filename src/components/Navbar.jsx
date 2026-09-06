import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../utils/api.js";
import {
  clearCurrentUser,
  currentUser,
  isAuthenticated,
} from "../mock/currentUser.js";
import { ROLES } from "../mock/roles.js";
import "../styles/navbar.css";

function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const signedIn = isAuthenticated();
  const dashboardPath =
    currentUser.role === ROLES.SYSTEM_ADMINISTRATOR
      ? "/admin"
      : currentUser.role === ROLES.STORE_OWNER
        ? "/owner"
        : null;
  const showStores = currentUser.role === ROLES.NORMAL_USER;

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      // Clearing the local session still logs the browser out if the API is unavailable.
    } finally {
      clearCurrentUser();
      setIsLoggingOut(false);
      navigate("/auth", { replace: true });
    }
  }

  return (
    <nav>
      <p>Clothing Store</p>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        {showStores ? (
          <li>
            <Link to="/stores">Stores</Link>
          </li>
        ) : null}
        {dashboardPath ? (
          <li className={pathname.startsWith(dashboardPath) ? "is-active" : ""}>
            <Link to={dashboardPath}>Dashboard</Link>
          </li>
        ) : null}
        {signedIn ? (
          <li className={pathname === "/password" ? "is-active" : ""}>
            <Link to="/password">Security</Link>
          </li>
        ) : null}
        <li>
          <a href="#about">About</a>
        </li>
        <li>
          <a href="#contact">Contact</a>
        </li>
        <li className="auth-btn">
          {signedIn ? (
            <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? "Logging out…" : "Log out"}
            </button>
          ) : (
            <Link to="/auth">Get Started</Link>
          )}
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
