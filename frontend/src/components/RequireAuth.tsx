import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};
