import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FolderKanban, CheckSquare, User, MessageSquare } from 'lucide-react';
import { systemApi } from '../api/endpoints.js';
import { useUIStore } from '../store/uiStore.js';
import { useDebounced } from '../hooks/useAsync.js';
import Modal from './ui/Modal.jsx';
import Avatar from './ui/Avatar.jsx';
import { statusMeta, priorityMeta } from '../constants/index.js';
import './CommandCenter.css';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const open = useUIStore((s) => s.searchOpen);
  const setOpen = useUIStore((s) => s.setSearchOpen);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(query, 260);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults(null);
    }
  }, [open]);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    systemApi
      .search(debounced.trim())
      .then((r) => !cancelled && setResults(r))
      .catch(() => !cancelled && setResults(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const go = (path) => {
    setOpen(false);
    setTimeout(() => navigate(path), 40);
  };

  const total =
    (results?.projects.length || 0) +
    (results?.tasks.length || 0) +
    (results?.users.length || 0) +
    (results?.comments.length || 0);

  return (
    <Modal open={open} onClose={() => setOpen(false)} size="lg">
      <div className="cmd">
        <div className="cmd__input-row">
          <Search size={16} className="muted" />
          <input
            data-autofocus
            className="cmd__input"
            placeholder="Search projects, tasks, people and comments…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
          />
          {loading && <span className="spinner" style={{ color: 'var(--primary)' }} />}
          <kbd className="cmd__kbd">Esc</kbd>
        </div>

        <div className="cmd__list">
          {query.trim().length < 2 && (
            <p className="muted cmd__none">Type at least two characters to search.</p>
          )}

          {query.trim().length >= 2 && !loading && total === 0 && (
            <p className="muted cmd__none">No matches for “{query}”.</p>
          )}

          {results?.projects.length > 0 && (
            <>
              <p className="eyebrow cmd__group">Projects</p>
              {results.projects.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  className="cmd__item"
                  onClick={() => go(`/projects/${p._id}`)}
                >
                  <FolderKanban size={15} className="cmd__icon" />
                  <span className="grow truncate">{p.name}</span>
                  <span className="badge">{p.status.replace('_', ' ')}</span>
                </button>
              ))}
            </>
          )}

          {results?.tasks.length > 0 && (
            <>
              <p className="eyebrow cmd__group">Tasks</p>
              {results.tasks.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  className="cmd__item"
                  onClick={() => go(`/projects/${t.project?._id}/board?task=${t._id}`)}
                >
                  <CheckSquare size={15} className="cmd__icon" />
                  <span className="grow truncate">{t.title}</span>
                  <span className="badge badge--dot" style={{ color: priorityMeta(t.priority).color }}>
                    {priorityMeta(t.priority).label}
                  </span>
                  <span className="badge" style={{ color: statusMeta(t.status).color }}>
                    {statusMeta(t.status).label}
                  </span>
                </button>
              ))}
            </>
          )}

          {results?.users.length > 0 && (
            <>
              <p className="eyebrow cmd__group">People</p>
              {results.users.map((u) => (
                <button key={u._id} type="button" className="cmd__item" onClick={() => go('/team')}>
                  <Avatar user={u} size="xs" />
                  <span className="grow truncate">{u.name}</span>
                  <span className="subtle">{u.jobTitle || u.email}</span>
                </button>
              ))}
            </>
          )}

          {results?.comments.length > 0 && (
            <>
              <p className="eyebrow cmd__group">Comments</p>
              {results.comments.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  className="cmd__item"
                  onClick={() => go(`/projects/${c.project}/board?task=${c.task}`)}
                >
                  <MessageSquare size={15} className="cmd__icon" />
                  <span className="grow truncate">{c.body}</span>
                  <span className="subtle">{c.author?.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
