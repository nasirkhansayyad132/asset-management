import { Navigate } from "react-router-dom";
import { useAuth, Role } from "../lib/auth";

export const RequireRole = ({
  children,
  roles
}: {
  children: JSX.Element;
  roles: Role[];
}) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};
