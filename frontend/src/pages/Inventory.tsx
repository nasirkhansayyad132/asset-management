import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

type Session = {
  id: string;
  location: string;
  startedAt: string;
};

type Report = {
  session: Session;
  verifiedCount: number;
  missing: Array<{ assetTag: string; location: string }>;
  unexpected: Array<{ assetTag: string; location: string }>;
};

export default function Inventory() {
  const [location, setLocation] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [scanHistory, setScanHistory] = useState<string[]>([]);

  const startSessionMutation = useMutation({
    mutationFn: (payload: { location: string }) =>
      apiFetch<Session>("/inventory/sessions", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: (data) => {
      setSession(data);
      setReport(null);
      setScanHistory([]);
      setScanInput("");
    }
  });

  const scanMutation = useMutation({
    mutationFn: (payload: { assetId?: string; payload?: string }) =>
      apiFetch(`/inventory/sessions/${session?.id}/scan`, {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      if (scanInput) {
        setScanHistory((prev) => [scanInput, ...prev]);
        setScanInput("");
      }
    }
  });

  const reportMutation = useMutation({
    mutationFn: () => apiFetch<Report>(`/inventory/sessions/${session?.id}/report`),
    onSuccess: (data) => setReport(data)
  });

  const canScan = Boolean(session);

  const missingList = useMemo(() => report?.missing || [], [report]);
  const unexpectedList = useMemo(() => report?.unexpected || [], [report]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Inventory Sessions</h1>
          <p>Start a location scan and verify assets against records.</p>
        </div>
      </header>

      <section className="grid two">
        <div className="card">
          <h3>Start Session</h3>
          <label className="field">
            <span>Location</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="e.g. HQ Stores"
            />
          </label>
          <button
            className="btn primary"
            disabled={!location || startSessionMutation.isPending}
            onClick={() => startSessionMutation.mutate({ location })}
          >
            Start session
          </button>

          {session && (
            <div className="callout">
              <strong>Active Session</strong>
              <div>{session.location}</div>
              <div className="mono">{session.id}</div>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Scan Assets</h3>
          <label className="field">
            <span>Asset ID or QR payload</span>
            <input
              value={scanInput}
              onChange={(event) => setScanInput(event.target.value)}
              placeholder="Paste asset ID or QR payload"
              disabled={!canScan}
            />
          </label>
          <button
            className="btn primary"
            disabled={!scanInput || !canScan || scanMutation.isPending}
            onClick={() => {
              if (scanInput.includes("|")) {
                scanMutation.mutate({ payload: scanInput });
              } else {
                scanMutation.mutate({ assetId: scanInput });
              }
            }}
          >
            Record scan
          </button>
          <button
            className="btn ghost"
            disabled={!canScan || reportMutation.isPending}
            onClick={() => reportMutation.mutate()}
          >
            Generate report
          </button>

          {scanHistory.length > 0 && (
            <ul className="list compact">
              {scanHistory.slice(0, 5).map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {report && (
        <section className="grid two">
          <div className="card">
            <h3>Verification Summary</h3>
            <div className="stat-block">
              <span>Verified</span>
              <strong>{report.verifiedCount}</strong>
            </div>
            <div className="stat-block">
              <span>Missing</span>
              <strong>{missingList.length}</strong>
            </div>
            <div className="stat-block">
              <span>Unexpected</span>
              <strong>{unexpectedList.length}</strong>
            </div>
          </div>
          <div className="card">
            <h3>Missing Assets</h3>
            <ul className="list">
              {missingList.map((asset) => (
                <li key={asset.assetTag}>
                  {asset.assetTag} - {asset.location}
                </li>
              ))}
              {missingList.length === 0 && <li>No missing assets.</li>}
            </ul>
          </div>
          <div className="card">
            <h3>Unexpected Assets</h3>
            <ul className="list">
              {unexpectedList.map((asset) => (
                <li key={asset.assetTag}>
                  {asset.assetTag} - {asset.location}
                </li>
              ))}
              {unexpectedList.length === 0 && <li>No unexpected assets.</li>}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
