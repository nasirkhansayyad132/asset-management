import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  actorUserId: string;
  createdAt: string;
  metaJson?: Record<string, unknown> | null;
  actor?: { email: string } | null;
};

export default function Audit() {
  const [filters, setFilters] = useState({
    action: "",
    entityType: "",
    actorUserId: "",
    from: "",
    to: ""
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
    const suffix = params.toString();
    return suffix ? `?${suffix}` : "";
  }, [filters]);

  const logsQuery = useQuery({
    queryKey: ["audit", filters],
    queryFn: () => apiFetch<AuditLog[]>(`/audit${queryString}`)
  });

  const exportCsv = async () => {
    const blob = await apiFetch<Blob>(`/audit/export.csv${queryString}`);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "audit-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Audit Logs</h1>
          <p>Trace every major action and export for compliance.</p>
        </div>
        <button className="btn ghost" onClick={exportCsv}>
          Export CSV
        </button>
      </header>

      <section className="card filter-bar">
        <label>
          Action
          <input
            value={filters.action}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, action: event.target.value }))
            }
            placeholder="ASSIGN_REQUEST_CREATED"
          />
        </label>
        <label>
          Entity
          <input
            value={filters.entityType}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, entityType: event.target.value }))
            }
            placeholder="Asset"
          />
        </label>
        <label>
          Actor ID
          <input
            value={filters.actorUserId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, actorUserId: event.target.value }))
            }
            placeholder="User ID"
          />
        </label>
        <label>
          From
          <input
            type="date"
            value={filters.from}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, from: event.target.value }))
            }
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={filters.to}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, to: event.target.value }))
            }
          />
        </label>
      </section>

      {logsQuery.isLoading && <p className="hint">Loading audit logs...</p>}
      {logsQuery.isError && <p className="alert">Unable to load audit logs.</p>}

      <section className="card table">
        <div className="table-row header">
          <span>Action</span>
          <span>Entity</span>
          <span>Actor</span>
          <span>Date</span>
          <span></span>
        </div>
        {logsQuery.data?.map((log) => (
          <div key={log.id} className="table-row">
            <span className="mono">{log.action}</span>
            <span>
              {log.entityType}
              {log.entityId ? ` - ${log.entityId.slice(0, 6)}` : ""}
            </span>
            <span>{log.actor?.email || log.actorUserId.slice(0, 6)}</span>
            <span>{new Date(log.createdAt).toLocaleString()}</span>
            <span className="hint">
              {log.metaJson ? JSON.stringify(log.metaJson).slice(0, 40) : ""}
            </span>
          </div>
        ))}
        {!logsQuery.isLoading && logsQuery.data?.length === 0 && (
          <div className="table-row empty">No audit logs found.</div>
        )}
      </section>
    </div>
  );
}
