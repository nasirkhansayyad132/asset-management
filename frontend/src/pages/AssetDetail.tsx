import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";

type AssetEvent = {
  id: string;
  type: string;
  createdAt: string;
  metaJson?: Record<string, unknown> | null;
};

type Request = {
  id: string;
  type: string;
  status: string;
  toCustodian: string;
  createdAt: string;
};

type HandoverDoc = {
  id: string;
  filePath: string;
  sha256: string;
  uploadedAt: string;
};

type MaintenanceTicket = {
  id: string;
  status: string;
  issue: string;
  openedAt: string;
  closedAt?: string | null;
  recommendDisposal?: boolean;
};

type AssetDetail = {
  id: string;
  assetTag: string;
  category: string;
  make?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  cost?: number | null;
  vendor?: string | null;
  purchaseDate?: string | null;
  location: string;
  status: string;
  condition?: string | null;
  custodian?: string | null;
  events: AssetEvent[];
  requests: Request[];
  handovers: HandoverDoc[];
  maintenanceTickets: MaintenanceTicket[];
};

export default function AssetDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [assignCustodian, setAssignCustodian] = useState("");
  const [transferCustodian, setTransferCustodian] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadRequestId, setUploadRequestId] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [disposeReason, setDisposeReason] = useState("");
  const [disposeDestination, setDisposeDestination] = useState("");

  const assetQuery = useQuery({
    queryKey: ["asset", id],
    queryFn: () => apiFetch<AssetDetail>(`/assets/${id}`),
    enabled: Boolean(id)
  });

  const qrQuery = useQuery({
    queryKey: ["asset-qr", id],
    queryFn: async () => {
      const blob = await apiFetch<Blob>(`/assets/${id}/qr`);
      return URL.createObjectURL(blob);
    },
    enabled: Boolean(id)
  });

  useEffect(() => {
    if (!qrQuery.data) {
      return;
    }
    setQrUrl(qrQuery.data);
    return () => {
      URL.revokeObjectURL(qrQuery.data);
    };
  }, [qrQuery.data]);

  const assignMutation = useMutation({
    mutationFn: (payload: { toCustodian: string }) =>
      apiFetch(`/assets/${id}/assign-request`, {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset", id] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      setAssignCustodian("");
    }
  });

  const transferMutation = useMutation({
    mutationFn: (payload: { toCustodian: string }) =>
      apiFetch(`/assets/${id}/transfer-request`, {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset", id] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      setTransferCustodian("");
    }
  });

  const handoverMutation = useMutation({
    mutationFn: async (payload: { file: File; requestId?: string }) => {
      const formData = new FormData();
      formData.append("file", payload.file);
      if (payload.requestId) {
        formData.append("requestId", payload.requestId);
      }
      return apiFetch(`/assets/${id}/handover/upload`, {
        method: "POST",
        body: formData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset", id] });
      setUploadFile(null);
      setUploadRequestId("");
    }
  });

  const disposeMutation = useMutation({
    mutationFn: (payload: { reason?: string; toCustodian?: string }) =>
      apiFetch(`/assets/${id}/dispose-request`, {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset", id] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      setDisposeReason("");
      setDisposeDestination("");
    }
  });

  const asset = assetQuery.data;
  const canRequest = user?.role === "ADMIN" || user?.role === "STORE_CLERK";

  const events = useMemo(() => asset?.events || [], [asset]);

  if (assetQuery.isLoading) {
    return <p className="hint">Loading asset profile...</p>;
  }

  if (assetQuery.isError || !asset) {
    return <p className="alert">Unable to load asset profile.</p>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{asset.assetTag}</h1>
          <p className="mono small">{asset.id}</p>
          <p>{asset.category}</p>
        </div>
        <div className="pill">{asset.status}</div>
      </header>

      <section className="grid two">
        <div className="card">
          <h3>Asset Profile</h3>
          <div className="detail-grid">
            <div>
              <span>Location</span>
              <strong>{asset.location}</strong>
            </div>
            <div>
              <span>Custodian</span>
              <strong>{asset.custodian || "Unassigned"}</strong>
            </div>
            <div>
              <span>Make / Model</span>
              <strong>
                {[asset.make, asset.model].filter(Boolean).join(" ") || "-"}
              </strong>
            </div>
            <div>
              <span>Serial</span>
              <strong>{asset.serialNumber || "-"}</strong>
            </div>
            <div>
              <span>Vendor</span>
              <strong>{asset.vendor || "-"}</strong>
            </div>
            <div>
              <span>Condition</span>
              <strong>{asset.condition || "-"}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Asset QR</h3>
          {qrUrl ? (
            <>
              <img className="qr" src={qrUrl} alt="Asset QR" />
              <a className="link" href={qrUrl} download={`${asset.assetTag}.png`}>
                Download QR
              </a>
            </>
          ) : (
            <div className="qr-placeholder">Generating QR...</div>
          )}
        </div>
      </section>

      {canRequest && (
        <section className="grid two">
          <div className="card">
            <h3>Assignment Request</h3>
            <label className="field">
              <span>New custodian</span>
              <input
                value={assignCustodian}
                onChange={(event) => setAssignCustodian(event.target.value)}
                placeholder="e.g. ICT Unit"
              />
            </label>
            <button
              className="btn primary"
              disabled={!assignCustodian || assignMutation.isPending}
              onClick={() =>
                assignMutation.mutate({ toCustodian: assignCustodian })
              }
            >
              Submit assignment
            </button>
          </div>

          <div className="card">
            <h3>Transfer Request</h3>
            <label className="field">
              <span>Transfer to</span>
              <input
                value={transferCustodian}
                onChange={(event) => setTransferCustodian(event.target.value)}
                placeholder="e.g. Finance Dept"
              />
            </label>
            <button
              className="btn primary"
              disabled={!transferCustodian || transferMutation.isPending}
              onClick={() =>
                transferMutation.mutate({ toCustodian: transferCustodian })
              }
            >
              Submit transfer
            </button>
          </div>
        </section>
      )}

      {canRequest && (
        <section className="card">
          <h3>Disposal Request</h3>
          <p className="hint">
            Use when maintenance marks the asset as not recoverable.
          </p>
          <label className="field">
            <span>Reason</span>
            <input
              value={disposeReason}
              onChange={(event) => setDisposeReason(event.target.value)}
              placeholder="e.g. Beyond economic repair"
            />
          </label>
          <label className="field">
            <span>Disposal destination (optional)</span>
            <input
              value={disposeDestination}
              onChange={(event) => setDisposeDestination(event.target.value)}
              placeholder="Central Disposal Unit"
            />
          </label>
          <button
            className="btn"
            disabled={disposeMutation.isPending}
            onClick={() =>
              disposeMutation.mutate({
                reason: disposeReason || undefined,
                toCustodian: disposeDestination || undefined
              })
            }
          >
            Request disposal
          </button>
        </section>
      )}

      <section className="grid two">
        <div className="card">
          <h3>Handover Documents</h3>
          <ul className="list">
            {asset.handovers.map((doc) => (
              <li key={doc.id}>
                <div>
                  <strong>Uploaded</strong> {new Date(doc.uploadedAt).toLocaleString()}
                </div>
                <div className="mono">{doc.sha256}</div>
              </li>
            ))}
            {asset.handovers.length === 0 && (
              <li>No handover documents uploaded yet.</li>
            )}
          </ul>

          {canRequest && (
            <div className="form-row">
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
              />
              <input
                value={uploadRequestId}
                onChange={(event) => setUploadRequestId(event.target.value)}
                placeholder="Optional request ID"
              />
              <button
                className="btn ghost"
                disabled={!uploadFile || handoverMutation.isPending}
                onClick={() =>
                  uploadFile &&
                  handoverMutation.mutate({
                    file: uploadFile,
                    requestId: uploadRequestId || undefined
                  })
                }
              >
                Upload signed scan
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Maintenance History</h3>
          <ul className="list">
            {asset.maintenanceTickets.map((ticket) => (
              <li key={ticket.id}>
                <div>
                  <strong>{ticket.issue}</strong> ({ticket.status})
                </div>
                <div className="hint">
                  Opened {new Date(ticket.openedAt).toLocaleDateString()}
                  {ticket.closedAt
                    ? `, closed ${new Date(ticket.closedAt).toLocaleDateString()}`
                    : ""}
                </div>
                {ticket.recommendDisposal && (
                  <div className="hint">Marked not recoverable.</div>
                )}
              </li>
            ))}
            {asset.maintenanceTickets.length === 0 && (
              <li>No maintenance tickets recorded.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h3>Request History</h3>
          <ul className="list">
            {asset.requests.map((request) => (
              <li key={request.id}>
                <div>
                  <strong>{request.type}</strong> to {request.toCustodian} ({request.status})
                </div>
                <div className="hint">
                  {new Date(request.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
            {asset.requests.length === 0 && <li>No requests logged.</li>}
          </ul>
        </div>

        <div className="card">
          <h3>Event Log</h3>
          <ul className="list">
            {events.map((event) => (
              <li key={event.id}>
                <div>
                  <strong>{event.type}</strong>
                </div>
                <div className="hint">
                  {new Date(event.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
            {events.length === 0 && <li>No events recorded.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
