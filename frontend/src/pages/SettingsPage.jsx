import { useState } from 'react';
import { User, Shield, Palette, Bell, Save, LogOut } from 'lucide-react';
import { userApi, authApi } from '../api/endpoints.js';
import { useAuthStore } from '../store/authStore.js';
import { useUIStore } from '../store/uiStore.js';
import Avatar from '../components/ui/Avatar.jsx';
import ThemeControls from '../components/ThemeControls.jsx';
import './settings.css';

const SECTIONS = [
  { key: 'account', label: 'Account', icon: User },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

export default function SettingsPage() {
  const [section, setSection] = useState('account');

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Settings</h1>
          <p className="page-head__sub">Your profile, security and how Orvexa looks.</p>
        </div>
      </header>

      <div className="settings">
        <nav className="settings__nav" aria-label="Settings sections">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`settings__navitem ${section === key ? 'is-active' : ''}`}
              onClick={() => setSection(key)}
              aria-current={section === key}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        <div className="settings__body">
          {section === 'account' && <AccountSection />}
          {section === 'security' && <SecuritySection />}
          {section === 'appearance' && <AppearanceSection />}
          {section === 'notifications' && <NotificationsSection />}
        </div>
      </div>
    </>
  );
}

function AccountSection() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const toast = useUIStore((s) => s.toast);

  const [form, setForm] = useState({
    name: user.name || '',
    jobTitle: user.jobTitle || '',
    department: user.department || '',
    location: user.location || '',
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    skills: (user.skills || []).join(', '),
    availability: user.availability || 'available',
    weeklyTaskGoal: user.weeklyTaskGoal ?? 20,
  });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { user: updated } = await userApi.updateMe({
        ...form,
        weeklyTaskGoal: Number(form.weeklyTaskGoal),
        skills: form.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      updateUser(updated);
      toast({ title: 'Profile saved', tone: 'success' });
    } catch (err) {
      toast({ title: 'Profile not saved', description: err.message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="panel">
      <header className="panel__head">
        <h2 className="panel__title">Profile</h2>
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
          {saving ? <span className="spinner" /> : <><Save size={14} /> Save</>}
        </button>
      </header>

      <div className="panel__body col gap-5">
        <div className="row gap-4">
          <Avatar user={{ ...user, avatarUrl: form.avatarUrl }} size="xl" />
          <div className="field grow">
            <label className="label" htmlFor="s-avatar">
              Avatar URL
            </label>
            <input
              id="s-avatar"
              className="input"
              placeholder="https://…"
              value={form.avatarUrl}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            />
            <span className="field__hint">
              Paste an image URL. Leaving it empty shows your initials.
            </span>
          </div>
        </div>

        <div className="drawer__grid">
          <div className="field">
            <label className="label" htmlFor="s-name">Full name</label>
            <input id="s-name" className="input" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label className="label" htmlFor="s-email">Email</label>
            <input id="s-email" className="input" value={user.email} disabled />
            <span className="field__hint">Email cannot be changed here.</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="s-title">Job title</label>
            <input id="s-title" className="input" value={form.jobTitle}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          </div>
          <div className="field">
            <label className="label" htmlFor="s-dept">Department</label>
            <input id="s-dept" className="input" value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div className="field">
            <label className="label" htmlFor="s-loc">Location</label>
            <input id="s-loc" className="input" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="field">
            <label className="label" htmlFor="s-avail">Availability</label>
            <select id="s-avail" className="select" value={form.availability}
              onChange={(e) => setForm({ ...form, availability: e.target.value })}>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="away">Away</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="s-bio">Bio</label>
          <textarea id="s-bio" className="textarea" maxLength={500} value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>

        <div className="field">
          <label className="label" htmlFor="s-skills">Skills</label>
          <input id="s-skills" className="input" placeholder="React, MongoDB, Design systems"
            value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
          <span className="field__hint">Comma separated.</span>
        </div>

        <div className="field" style={{ maxWidth: 220 }}>
          <label className="label" htmlFor="s-goal">Weekly task goal</label>
          <input id="s-goal" type="number" min="1" max="200" className="input"
            value={form.weeklyTaskGoal}
            onChange={(e) => setForm({ ...form, weeklyTaskGoal: e.target.value })} />
          <span className="field__hint">Drives the progress ring on your dashboard.</span>
        </div>
      </div>
    </form>
  );
}

function SecuritySection() {
  const logoutAll = useAuthStore((s) => s.logout);
  const toast = useUIStore((s) => s.toast);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);

  const change = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.changePassword(form);
      toast({
        title: 'Password changed',
        description: 'All sessions were signed out. Please sign in again.',
        tone: 'success',
      });
      setForm({ currentPassword: '', newPassword: '' });
      setTimeout(() => logoutAll(), 1500);
    } catch (err) {
      toast({ title: 'Password not changed', description: err.message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const signOutEverywhere = async () => {
    try {
      await authApi.logoutAll();
      toast({ title: 'Signed out of all sessions', tone: 'success' });
      logoutAll();
    } catch (err) {
      toast({ title: 'Could not sign out everywhere', description: err.message, tone: 'error' });
    }
  };

  return (
    <div className="col gap-5">
      <form onSubmit={change} className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Change password</h2>
        </header>
        <div className="panel__body col gap-4" style={{ maxWidth: 400 }}>
          <div className="field">
            <label className="label" htmlFor="s-cur">Current password</label>
            <input id="s-cur" type="password" className="input" autoComplete="current-password"
              required value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
          </div>
          <div className="field">
            <label className="label" htmlFor="s-new">New password</label>
            <input id="s-new" type="password" className="input" autoComplete="new-password"
              required minLength={8} value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
            <span className="field__hint">At least 8 characters.</span>
          </div>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? <span className="spinner" /> : 'Change password'}
          </button>
          <p className="field__hint">
            Changing your password revokes every refresh token, so all your devices are signed out.
          </p>
        </div>
      </form>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Sessions</h2>
        </header>
        <div className="panel__body col gap-3">
          <p className="muted">
            Orvexa issues short-lived access tokens with rotating refresh tokens. Signing out
            everywhere revokes all of them immediately.
          </p>
          <button type="button" className="btn btn--danger" style={{ width: 'fit-content' }} onClick={signOutEverywhere}>
            <LogOut size={15} /> Sign out of all sessions
          </button>
        </div>
      </section>
    </div>
  );
}

function AppearanceSection() {
  return (
    <section className="panel">
      <header className="panel__head">
        <h2 className="panel__title">Appearance</h2>
      </header>
      <div className="panel__body">
        <ThemeControls />
      </div>
    </section>
  );
}

function NotificationsSection() {
  return (
    <section className="panel">
      <header className="panel__head">
        <h2 className="panel__title">Notifications</h2>
      </header>
      <div className="panel__body col gap-3">
        <p className="muted">
          Orvexa notifies you in-app and in real time when you are assigned a task, mentioned in a
          comment, when a task you reported is completed, when a blocker on your work clears, and
          when a deadline approaches.
        </p>
        <p className="field__hint">
          Email and push delivery are not part of this build. Rather than showing toggles that would
          not do anything, they are left out — every notification you see is delivered over the
          live socket connection.
        </p>
      </div>
    </section>
  );
}
