import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Check } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useUIStore } from '../store/uiStore.js';
import AuthShell from '../components/AuthShell.jsx';

const rules = [
  { test: (v) => v.length >= 8, label: 'At least 8 characters' },
  { test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v), label: 'Upper and lower case' },
  { test: (v) => /\d/.test(v), label: 'A number' },
];

export default function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const toast = useUIStore((s) => s.toast);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const passed = rules.filter((r) => r.test(form.password)).length;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await register(form);
      toast({ title: `Welcome to Orvexa, ${user.name.split(' ')[0]}`, tone: 'success' });
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="The first account created becomes the workspace admin."
      footer={
        <p className="muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="col gap-4" noValidate>
        {error && (
          <div className="auth__alert" role="alert">
            {error}
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            className="input"
            autoComplete="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">
            Password
          </label>
          <div className="auth__password">
            <input
              id="password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              aria-describedby="pw-rules"
            />
            <button
              type="button"
              className="auth__reveal"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="auth__meter" aria-hidden="true">
            {rules.map((r, i) => (
              <span key={r.label} className={i < passed ? 'is-on' : ''} />
            ))}
          </div>

          <ul id="pw-rules" className="auth__rules">
            {rules.map((r) => {
              const ok = r.test(form.password);
              return (
                <li key={r.label} className={ok ? 'is-ok' : ''}>
                  <Check size={12} /> {r.label}
                </li>
              );
            })}
          </ul>
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--lg btn--block"
          disabled={submitting || form.password.length < 8}
        >
          {submitting ? <span className="spinner" /> : <>Create account <ArrowRight size={16} /></>}
        </button>
      </form>
    </AuthShell>
  );
}
