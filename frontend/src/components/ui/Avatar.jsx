import { initials } from '../../utils/format.js';
import './Avatar.css';

const SIZES = { xs: 20, sm: 26, md: 32, lg: 44, xl: 72 };

export default function Avatar({ user, size = 'md', online, className = '' }) {
  const px = SIZES[size] || SIZES.md;
  const name = user?.name || 'Unknown';

  return (
    <span
      className={`avatar avatar--${size} ${className}`}
      style={{ width: px, height: px, fontSize: Math.max(9, px * 0.36) }}
      title={name}
    >
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="avatar__img" />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
      <span className="sr-only">{name}</span>
      {online !== undefined && (
        <span className={`avatar__dot ${online ? 'is-online' : ''}`} aria-hidden="true" />
      )}
    </span>
  );
}

export function AvatarGroup({ users = [], max = 4, size = 'sm' }) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;

  return (
    <span className="avatar-group">
      {shown.map((u) => (
        <Avatar key={u?._id || u?.name} user={u} size={size} />
      ))}
      {rest > 0 && (
        <span className={`avatar avatar--${size} avatar--rest`} title={`${rest} more`}>
          +{rest}
        </span>
      )}
    </span>
  );
}
