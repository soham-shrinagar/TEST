import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import BrandLogo from './BrandLogo';
import { lineupCopy } from '../constants/lineupCopy';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const navItems = useMemo(() => {
    if (user?.role === 'store') {
      return [
        { to: '/store/dashboard', label: 'Dashboard' },
        { to: '/store/deals/new', label: lineupCopy.createDeal },
        { to: '/store/profile/edit', label: 'Profile' },
      ];
    }

    const items = [
        { to: '/feed', label: lineupCopy.discover },
        { to: '/matches', label: 'Matches' },
        { to: '/messages', label: 'Messages' },
        { to: '/dashboard', label: user?.role === 'brand' ? lineupCopy.brandDashboard : 'Dashboard' },
        { to: '/profile', label: 'Profile' },
    ];
    if (user?.role === 'brand') {
      items.splice(1, 0, { to: '/brand/campaigns', label: lineupCopy.campaignsNav });
    }
    if (user?.role === 'creator' || user?.role === 'influencer') {
      items.splice(0, items.length,
        { to: '/creator/deals', label: lineupCopy.discover },
        { to: '/creator/dashboard', label: 'Dashboard' },
        { to: '/messages', label: 'Messages' },
        { to: '/profile', label: 'Profile' },
      );
    }
    return items;
  }, [user?.role]);

  useEffect(() => {
    if (!user) return undefined;

    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/messenger/conversations');
        const all = [...(data.matched || []), ...(data.outreach || [])];
        setUnreadCount(all.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0));
      } catch {
        setUnreadCount(0);
      }
    };

    fetchUnread();
    const timer = window.setInterval(fetchUnread, 30000);
    return () => window.clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications');
        setNotifications(data);
      } catch {
        setNotifications([]);
      }
    };

    fetchNotifications();
    const timer = window.setInterval(fetchNotifications, 30000);
    return () => window.clearInterval(timer);
  }, [user]);

  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  };

  const openNotification = async (notification) => {
    try {
      await api.patch(`/notifications/${notification._id}/read`);
    } catch {
      // Navigation should still continue if the read update fails.
    }
    setNotifications((current) => current.map((item) => (
      item._id === notification._id ? { ...item, read: true } : item
    )));
    setShowNotifications(false);
    if (notification.link) navigate(notification.link);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `whitespace-nowrap border-[1.5px] px-3.5 py-2 text-sm font-bold transition active:translate-y-0.5 ${
      isActive
        ? 'border-ink bg-ink text-paper'
        : 'border-transparent text-inkSoft hover:border-ink hover:text-ink'
    }`;

  return (
    <nav className="marquee-nav">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <NavLink to={user?.role === 'store' ? '/store/dashboard' : '/feed'} className="shrink-0">
          <BrandLogo />
        </NavLink>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <div className="flex items-center gap-0.5 overflow-x-auto border-2 border-ink bg-paper p-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={(state) => `${linkClass(state)} relative`}>
                {item.label}
                {item.to === '/messages' && unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-accent px-1 font-mono text-[10px] font-extrabold text-paper">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((current) => !current)}
              className="relative inline-flex h-10 w-10 items-center justify-center border-2 border-ink bg-paper transition hover:bg-ink/5"
              aria-label="Notifications"
            >
              <img
                src="/notification-bell.png"
                alt=""
                className="h-[34px] w-[34px] object-contain"
                aria-hidden="true"
              />
              {unreadNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-accent px-1 font-mono text-[10px] font-extrabold text-paper">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              ) : null}
            </button>
            {showNotifications ? (
              <div className="modal-panel absolute right-0 mt-2 w-80 overflow-hidden">
                <div className="flex items-center justify-between border-b-2 border-ink px-4 py-3">
                  <p className="font-display text-sm uppercase text-ink">Notifications</p>
                  <button type="button" onClick={markAllRead} className="font-mono text-xs font-bold text-inkSoft hover:text-ink">Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.slice(0, 5).length ? notifications.slice(0, 5).map((notification) => (
                    <button
                      key={notification._id}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className="block w-full border-b border-ink/20 px-4 py-3 text-left transition hover:bg-ink/5"
                    >
                      <div className="flex gap-3">
                        <span className={`mt-1 h-2 w-2 shrink-0 ${notification.read ? 'bg-ink/15' : 'bg-accent'}`} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-ink">{notification.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-inkSoft">{notification.message}</p>
                        </div>
                      </div>
                    </button>
                  )) : (
                    <div className="px-4 py-6 text-center text-sm font-bold text-inkSoft">No notifications yet.</div>
                  )}
                </div>
                <Link to="/dashboard" className="block px-4 py-3 text-center font-mono text-xs font-extrabold uppercase tracking-wider text-inkSoft hover:bg-ink/5" onClick={() => setShowNotifications(false)}>
                  See all
                </Link>
              </div>
            ) : null}
          </div>

          <span className="hidden border-2 border-ink bg-paper px-2.5 py-1 font-mono text-xs font-bold uppercase capitalize text-inkSoft lg:inline-flex">
            {user?.role}
          </span>

          <button onClick={handleLogout} className="btn-secondary shrink-0 px-3.5 py-2 text-sm">
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
