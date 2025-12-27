import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";

type Asset = {
  id: string;
  status: string;
};

type Request = {
  id: string;
  status: string;
};

export default function Dashboard() {
  const { user } = useAuth();
  const canViewRequests =
    user?.role === "ADMIN" || user?.role === "APPROVER" || user?.role === "STORE_CLERK";
  const assetsQuery = useQuery({
    queryKey: ["assets"],
    queryFn: () => apiFetch<Asset[]>("/assets")
  });

  const requestsQuery = useQuery({
    queryKey: ["requests", "pending"],
    queryFn: () => apiFetch<Request[]>("/requests?status=PENDING"),
    enabled: canViewRequests
  });

  const assets = assetsQuery.data || [];
  const counts = assets.reduce(
    (acc, asset) => {
      acc.total += 1;
      acc[asset.status] = (acc[asset.status] || 0) + 1;
      return acc;
    },
    { total: 0 } as Record<string, number>
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Operational Dashboard</h1>
          <p>Live status snapshot for the ministry asset program.</p>
        </div>
      </header>

      <section className="grid">
        <div className="card stat">
          <span className="stat-label">Total Assets</span>
          <strong>{counts.total || 0}</strong>
        </div>
        <div className="card stat">
          <span className="stat-label">In Store</span>
          <strong>{counts.IN_STORE || 0}</strong>
        </div>
        <div className="card stat">
          <span className="stat-label">Assigned</span>
          <strong>{counts.ASSIGNED || 0}</strong>
        </div>
        <div className="card stat">
          <span className="stat-label">Maintenance</span>
          <strong>{counts.UNDER_MAINTENANCE || 0}</strong>
        </div>
        <div className="card stat">
          <span className="stat-label">Disposed</span>
          <strong>{counts.DISPOSED || 0}</strong>
        </div>
        <div className="card stat">
          <span className="stat-label">Pending Approvals</span>
          <strong>{canViewRequests ? requestsQuery.data?.length || 0 : "-"}</strong>
        </div>
      </section>

      {(assetsQuery.isLoading || (canViewRequests && requestsQuery.isLoading)) && (
        <p className="hint">Loading dashboard metrics...</p>
      )}
      {(assetsQuery.isError || (canViewRequests && requestsQuery.isError)) && (
        <p className="alert">Unable to load dashboard data.</p>
      )}
    </div>
  );
}
