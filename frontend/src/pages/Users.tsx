import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { Role } from "../lib/auth";

type User = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
};

export default function Users() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STORE_CLERK");

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<User[]>("/users")
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({ email, password, role })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEmail("");
      setPassword("");
      setRole("STORE_CLERK");
    }
  });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Create and manage role-based access accounts.</p>
        </div>
      </header>

      <section className="grid two">
        <div className="card">
          <h3>Create User</h3>
          <label className="field">
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@ministry.gov"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
              <option value="ADMIN">ADMIN</option>
              <option value="STORE_CLERK">STORE_CLERK</option>
              <option value="APPROVER">APPROVER</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="INVENTORY">INVENTORY</option>
              <option value="AUDITOR">AUDITOR</option>
            </select>
          </label>
          <button
            className="btn primary"
            disabled={!email || !password || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create user
          </button>
        </div>

        <div className="card">
          <h3>Users</h3>
          {usersQuery.isLoading && <p className="hint">Loading users...</p>}
          {usersQuery.isError && <p className="alert">Unable to load users.</p>}
          <ul className="list">
            {usersQuery.data?.map((user) => (
              <li key={user.id}>
                <div>
                  <strong>{user.email}</strong>
                  <div className="hint">{user.role}</div>
                </div>
                <div className="hint">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </li>
            ))}
            {usersQuery.data?.length === 0 && <li>No users created yet.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
