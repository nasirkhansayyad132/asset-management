import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

type RequestItem = {
  id: string;
  type: string;
  status: string;
  toCustodian: string;
  asset: {
    assetTag: string;
    category: string;
    location: string;
  };
  requester: {
    email: string;
  };
  createdAt: string;
};

export default function Approvals() {
  const queryClient = useQueryClient();
  const requestsQuery = useQuery({
    queryKey: ["requests", "pending"],
    queryFn: () => apiFetch<RequestItem[]>("/requests?status=PENDING")
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) =>
      apiFetch(`/requests/${requestId}/approve`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) =>
      apiFetch(`/requests/${requestId}/reject`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    }
  });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Approvals Queue</h1>
          <p>Review assignment and transfer requests awaiting approval.</p>
        </div>
      </header>

      {requestsQuery.isLoading && <p className="hint">Loading requests...</p>}
      {requestsQuery.isError && (
        <p className="alert">Unable to load approval queue.</p>
      )}

      <section className="grid">
        {requestsQuery.data?.map((request) => (
          <div key={request.id} className="card">
            <div className="card-header">
              <div>
                <strong>{request.type}</strong>
                <div className="hint">
                  {request.asset.assetTag} - {request.asset.category}
                </div>
              </div>
              <span className="pill">{request.status}</span>
            </div>
            <div className="detail-grid">
              <div>
                <span>To custodian</span>
                <strong>{request.toCustodian}</strong>
              </div>
              <div>
                <span>Location</span>
                <strong>{request.asset.location}</strong>
              </div>
              <div>
                <span>Requested by</span>
                <strong>{request.requester.email}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{new Date(request.createdAt).toLocaleString()}</strong>
              </div>
            </div>
            <div className="actions">
              <button
                className="btn primary"
                onClick={() => approveMutation.mutate(request.id)}
                disabled={approveMutation.isPending}
              >
                Approve
              </button>
              <button
                className="btn ghost"
                onClick={() => rejectMutation.mutate(request.id)}
                disabled={rejectMutation.isPending}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
        {!requestsQuery.isLoading && requestsQuery.data?.length === 0 && (
          <div className="card empty">No pending requests.</div>
        )}
      </section>
    </div>
  );
}
