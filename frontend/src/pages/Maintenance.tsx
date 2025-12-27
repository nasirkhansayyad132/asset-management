import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

type Ticket = {
  id: string;
  assetId: string;
  status: string;
  issue: string;
  vendor?: string | null;
  cost?: number | null;
  openedAt: string;
  closedAt?: string | null;
  recommendDisposal?: boolean;
  asset: {
    assetTag: string;
    category: string;
    location: string;
  };
};

export default function Maintenance() {
  const queryClient = useQueryClient();
  const [assetId, setAssetId] = useState("");
  const [issue, setIssue] = useState("");
  const [vendor, setVendor] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const ticketsQuery = useQuery({
    queryKey: ["maintenance"],
    queryFn: () => apiFetch<Ticket[]>("/maintenance")
  });

  const openMutation = useMutation({
    mutationFn: (payload: {
      assetId: string;
      issue: string;
      vendor?: string;
      cost?: number;
      notes?: string;
    }) =>
      apiFetch(`/assets/${payload.assetId}/maintenance`, {
        method: "POST",
        body: JSON.stringify({
          issue: payload.issue,
          vendor: payload.vendor,
          cost: payload.cost,
          notes: payload.notes
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setAssetId("");
      setIssue("");
      setVendor("");
      setCost("");
      setNotes("");
    }
  });

  const closeMutation = useMutation({
    mutationFn: (payload: { ticketId: string; notRecoverable?: boolean }) =>
      apiFetch(`/maintenance/${payload.ticketId}/close`, {
        method: "PATCH",
        body: JSON.stringify({ notRecoverable: payload.notRecoverable })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    }
  });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Maintenance</h1>
          <p>Open and close maintenance tickets for assets.</p>
        </div>
      </header>

      <section className="grid two">
        <div className="card">
          <h3>Open Ticket</h3>
          <label className="field">
            <span>Asset ID</span>
            <input
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
              placeholder="Asset ID"
            />
          </label>
          <label className="field">
            <span>Issue</span>
            <input
              value={issue}
              onChange={(event) => setIssue(event.target.value)}
              placeholder="Describe the issue"
            />
          </label>
          <label className="field">
            <span>Vendor</span>
            <input
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
              placeholder="Service vendor"
            />
          </label>
          <label className="field">
            <span>Cost</span>
            <input
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder="Estimated cost"
            />
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Additional notes"
              rows={3}
            />
          </label>
          <button
            className="btn primary"
            disabled={!assetId || !issue || openMutation.isPending}
            onClick={() =>
              openMutation.mutate({
                assetId,
                issue,
                vendor: vendor || undefined,
                cost: cost ? Number(cost) : undefined,
                notes: notes || undefined
              })
            }
          >
            Open ticket
          </button>
        </div>

        <div className="card">
          <h3>Open Tickets</h3>
          {ticketsQuery.isLoading && <p className="hint">Loading tickets...</p>}
          {ticketsQuery.isError && (
            <p className="alert">Unable to load tickets.</p>
          )}
          <ul className="list">
            {ticketsQuery.data?.map((ticket) => (
              <li key={ticket.id}>
                <div className="list-row">
                  <div>
                    <strong>{ticket.issue}</strong>
                    <div className="hint">
                      {ticket.asset.assetTag} - {ticket.asset.location}
                    </div>
                  </div>
                  <div className="pill">{ticket.status}</div>
                </div>
                {ticket.recommendDisposal && (
                  <div className="hint">Marked not recoverable.</div>
                )}
                <div className="hint">
                  Opened {new Date(ticket.openedAt).toLocaleDateString()}
                  {ticket.vendor ? ` - ${ticket.vendor}` : ""}
                </div>
                {ticket.status === "OPEN" && (
                  <div className="actions">
                    <button
                      className="btn ghost"
                      onClick={() => closeMutation.mutate({ ticketId: ticket.id })}
                      disabled={closeMutation.isPending}
                    >
                      Close ticket
                    </button>
                    <button
                      className="btn"
                      onClick={() =>
                        closeMutation.mutate({
                          ticketId: ticket.id,
                          notRecoverable: true
                        })
                      }
                      disabled={closeMutation.isPending}
                    >
                      Mark unrecoverable
                    </button>
                  </div>
                )}
              </li>
            ))}
            {ticketsQuery.data?.length === 0 && <li>No tickets found.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
