import { Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';

export default function Forbidden() {
  const role = useAuthStore((s) => s.user?.role);

  return (
    <div className="state" style={{ minHeight: '60vh' }}>
      <span className="state__icon state__icon--danger">
        <Lock size={22} strokeWidth={1.6} />
      </span>
      <p className="eyebrow">403</p>
      <h1 className="state__title" style={{ fontSize: 'var(--text-2xl)' }}>
        You do not have access to this area
      </h1>
      <p className="muted state__desc">
        Your account has the <strong>{role}</strong> role, which does not include this section. The
        same check runs on the server, so this is not just a hidden menu item.
      </p>
      <Link to="/dashboard" className="btn btn--primary">
        <ArrowLeft size={15} /> Back to dashboard
      </Link>
    </div>
  );
}
