import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="page">
      <div className="card empty">
        <h2>Page not found</h2>
        <p>Return to the dashboard.</p>
        <Link className="btn primary" to="/">
          Go home
        </Link>
      </div>
    </div>
  );
}
