import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";

const buildQuery = (params: Record<string, string>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.append(key, value);
    }
  });
  const suffix = search.toString();
  return suffix ? `?${suffix}` : "";
};

type Asset = {
  id: string;
  assetTag: string;
  category: string;
  location: string;
  status: string;
  custodian: string | null;
};

export default function Assets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    location: "",
    custodian: ""
  });
  const [form, setForm] = useState({
    category: "",
    location: "",
    make: "",
    model: "",
    serialNumber: "",
    vendor: "",
    cost: "",
    condition: ""
  });

  const queryString = useMemo(() => buildQuery(filters), [filters]);

  const assetsQuery = useQuery({
    queryKey: ["assets", filters],
    queryFn: () => apiFetch<Asset[]>(`/assets${queryString}`)
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/assets", {
        method: "POST",
        body: JSON.stringify({
          category: form.category,
          location: form.location,
          make: form.make || undefined,
          model: form.model || undefined,
          serialNumber: form.serialNumber || undefined,
          vendor: form.vendor || undefined,
          cost: form.cost ? Number(form.cost) : undefined,
          condition: form.condition || undefined
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setForm({
        category: "",
        location: "",
        make: "",
        model: "",
        serialNumber: "",
        vendor: "",
        cost: "",
        condition: ""
      });
    }
  });

  const canCreate = user?.role === "ADMIN" || user?.role === "STORE_CLERK";

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Assets Registry</h1>
          <p>Filter, review, and drill into asset profiles.</p>
        </div>
      </header>

      <section className="card filter-bar">
        <label>
          Status
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, status: event.target.value }))
            }
          >
            <option value="">All</option>
            <option value="IN_STORE">IN_STORE</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
            <option value="DISPOSED">DISPOSED</option>
          </select>
        </label>
        <label>
          Category
          <input
            value={filters.category}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, category: event.target.value }))
            }
            placeholder="e.g. Laptop"
          />
        </label>
        <label>
          Location
          <input
            value={filters.location}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, location: event.target.value }))
            }
            placeholder="e.g. HQ Stores"
          />
        </label>
        <label>
          Custodian
          <input
            value={filters.custodian}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, custodian: event.target.value }))
            }
            placeholder="e.g. ICT Unit"
          />
        </label>
      </section>

      {canCreate && (
        <section className="card">
          <h3>Create Asset</h3>
          <div className="form-grid">
            <label>
              Category
              <input
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                placeholder="e.g. Laptop"
              />
            </label>
            <label>
              Location
              <input
                value={form.location}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, location: event.target.value }))
                }
                placeholder="HQ Stores"
              />
            </label>
            <label>
              Make
              <input
                value={form.make}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, make: event.target.value }))
                }
              />
            </label>
            <label>
              Model
              <input
                value={form.model}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, model: event.target.value }))
                }
              />
            </label>
            <label>
              Serial
              <input
                value={form.serialNumber}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    serialNumber: event.target.value
                  }))
                }
              />
            </label>
            <label>
              Vendor
              <input
                value={form.vendor}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, vendor: event.target.value }))
                }
              />
            </label>
            <label>
              Cost
              <input
                value={form.cost}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cost: event.target.value }))
                }
                placeholder="0.00"
              />
            </label>
            <label>
              Condition
              <input
                value={form.condition}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, condition: event.target.value }))
                }
                placeholder="New, Good, Fair"
              />
            </label>
          </div>
          <button
            className="btn primary"
            disabled={!form.category || !form.location || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create asset
          </button>
        </section>
      )}

      {assetsQuery.isLoading && <p className="hint">Loading assets...</p>}
      {assetsQuery.isError && (
        <p className="alert">Unable to load assets list.</p>
      )}

      <section className="card table assets-table">
        <div className="table-row header">
          <span>Tag</span>
          <span>Asset ID</span>
          <span>Category</span>
          <span>Location</span>
          <span>Status</span>
          <span>Custodian</span>
          <span></span>
        </div>
        {assetsQuery.data?.map((asset) => (
          <div key={asset.id} className="table-row">
            <span className="mono">{asset.assetTag}</span>
            <span className="mono small">{asset.id}</span>
            <span>{asset.category}</span>
            <span>{asset.location}</span>
            <span className="pill">{asset.status}</span>
            <span>{asset.custodian || "-"}</span>
            <Link className="link" to={`/assets/${asset.id}`}>
              View
            </Link>
          </div>
        ))}
        {!assetsQuery.isLoading && assetsQuery.data?.length === 0 && (
          <div className="table-row empty">No assets match the filter.</div>
        )}
      </section>
    </div>
  );
}
