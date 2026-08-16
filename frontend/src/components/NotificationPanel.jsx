import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, BellOff } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore.js';
import Avatar from './ui/Avatar.jsx';
import { fmtRelative } from '../utils/format.js';
import './NotificationPanel.css';

export default function NotificationPanel({ onClose }) {
  const { notifications, unreadCount, loading, load, markRead, markAllRead } =
    useNotificationStore();

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="notif" role="dialog" aria-label="Notifications">
      <header className="notif__head">
        <div className="grow">
          <p className="notif__title">Notifications</p>
          <p className="muted notif__sub">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </header>

      <div className="notif__list">
        {loading && notifications.length === 0 && (
          <div className="notif__empty">
            <span className="spinner" style={{ color: 'var(--primary)' }} />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="notif__empty">
            <BellOff size={20} className="muted" />
            <p className="muted">Nothing here yet. Activity on your work will appear here.</p>
          </div>
        )}

        {notifications.map((n) => {
          const Wrapper = n.link ? Link : 'div';
          return (
            <Wrapper
              key={n._id}
              {...(n.link ? { to: n.link, onClick: onClose } : {})}
              className={`notif__item ${n.read ? '' : 'is-unread'}`}
              onMouseEnter={() => !n.read && markRead(n._id)}
            >
              <Avatar user={n.actor || { name: 'Orvexa' }} size="sm" />
              <div className="grow">
                <p className="notif__item-title">{n.title}</p>
                {n.body && <p className="muted notif__item-body clamp-2">{n.body}</p>}
                <p className="subtle notif__time">{fmtRelative(n.createdAt)}</p>
              </div>
              {!n.read && <span className="notif__dot" aria-label="Unread" />}
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
