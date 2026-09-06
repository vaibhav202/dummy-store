import { Navigate, Outlet } from "react-router-dom";
import {
  currentUser,
  isAuthenticated,
} from "../mock/currentUser.js";

function RoleProtectedRoute({ allowedRoles }) {
  if (!isAuthenticated() || !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}

export default RoleProtectedRoute;
