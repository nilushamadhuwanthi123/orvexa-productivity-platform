import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="state" style={{ minHeight: '100vh' }}>
      <span className="state__icon">
        <Compass size={22} strokeWidth={1.6} />
      </span>
      <p className="eyebrow">404</p>
      <h1 className="state__title" style={{ fontSize: 'var(--text-2xl)' }}>
        This page does not exist
      </h1>
      <p className="muted state__desc">
        The link may be out of date, or the project or task it pointed to has been deleted.
      </p>
      <div className="row gap-2">
        <Link to="/dashboard" className="btn btn--primary">
          <ArrowLeft size={15} /> Back to dashboard
        </Link>
        <Link to="/" className="btn btn--secondary">
          Home
        </Link>
      </div>
    </div>
  );
}
