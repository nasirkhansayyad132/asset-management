import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { RequireRole } from "./components/RequireRole";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import AssetDetail from "./pages/AssetDetail";
import Approvals from "./pages/Approvals";
import Inventory from "./pages/Inventory";
import Maintenance from "./pages/Maintenance";
import Audit from "./pages/Audit";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="assets" element={<Assets />} />
        <Route path="assets/:id" element={<AssetDetail />} />
        <Route
          path="approvals"
          element={
            <RequireRole roles={["ADMIN", "APPROVER"]}>
              <Approvals />
            </RequireRole>
          }
        />
        <Route
          path="inventory"
          element={
            <RequireRole roles={["ADMIN", "INVENTORY"]}>
              <Inventory />
            </RequireRole>
          }
        />
        <Route
          path="maintenance"
          element={
            <RequireRole roles={["ADMIN", "MAINTENANCE"]}>
              <Maintenance />
            </RequireRole>
          }
        />
        <Route
          path="audit"
          element={
            <RequireRole roles={["ADMIN", "AUDITOR"]}>
              <Audit />
            </RequireRole>
          }
        />
        <Route
          path="users"
          element={
            <RequireRole roles={["ADMIN"]}>
              <Users />
            </RequireRole>
          }
        />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
