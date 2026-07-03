import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const navItems = useMemo(() => {
    // Store accounts have a completely separate nav
    if (user?.role === 'store') {
      return [
        { to: '/store/dashboard', label: 'Dashboard' },
        { to: '/store/deals/new', label: 'Post Deal' },
        { to: '/store/profile/edit', label: 'My Profile' },
      ];
    }

    const items = [
      { to: '/feed', label: 'Discover' },
      { to: '/matches', label: 'Matches' },
      { to: '/messages', label: 'Messages' },
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/profile', label: 'Profile' },
    ];
    if (user?.role === 'brand') {
      items.splice(1, 0, { to: '/brand/campaigns', label: 'Campaigns' });
    }
    if (user?.role === 'creator' || user?.role === 'influencer') {
      // Discover → /creator/deals (unified feed)
      // Dashboard → /creator/dashboard (merged campaigns + stats)
      // Remove generic /feed, /matches; replace with creator-specific nav
      items.splice(0, items.length,
        { to: '/creator/deals', label: 'Discover' },
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
    `whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold transition ${
      isActive
        ? 'bg-ink text-white'
        : 'text-ink/55 hover:bg-ink/5 hover:text-ink'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-ink/10 bg-white/86 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <NavLink to="/feed" className="shrink-0">
          <BrandLogo />
        </NavLink>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <div className="flex items-center gap-0.5 overflow-x-auto rounded-full border border-ink/10 bg-white p-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={(state) => `${linkClass(state)} relative`}>
                {item.label}
                {item.to === '/messages' && unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d64f4f] px-1 text-[10px] font-extrabold text-white">
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
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white transition hover:bg-ink/[0.04]"
              aria-label="Notifications"
            >
              <img
                src="/notification-bell.png"
                alt=""
                className="h-[34px] w-[34px] object-contain"
                aria-hidden="true"
              />
              {unreadNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d64f4f] px-1 text-[10px] font-extrabold text-white">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              ) : null}
            </button>
            {showNotifications ? (
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border border-ink/10 bg-white shadow-[0_18px_55px_rgba(8,7,11,0.16)]">
                <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
                  <p className="text-sm font-extrabold text-ink">Notifications</p>
                  <button type="button" onClick={markAllRead} className="text-xs font-bold text-ink/50 hover:text-ink">Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.slice(0, 5).length ? notifications.slice(0, 5).map((notification) => (
                    <button
                      key={notification._id}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className="block w-full border-b border-ink/10 px-4 py-3 text-left transition hover:bg-ink/[0.035]"
                    >
                      <div className="flex gap-3">
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-ink/15' : 'bg-[#d64f4f]'}`} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-ink">{notification.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/55">{notification.message}</p>
                        </div>
                      </div>
                    </button>
                  )) : (
                    <div className="px-4 py-6 text-center text-sm font-bold text-ink/45">No notifications yet.</div>
                  )}
                </div>
                <Link to="/dashboard" className="block px-4 py-3 text-center text-xs font-extrabold text-ink/55 hover:bg-ink/[0.035]" onClick={() => setShowNotifications(false)}>
                  See all
                </Link>
              </div>
            ) : null}
          </div>

          <span className="hidden rounded-full border border-ink/10 bg-white px-2.5 py-1 text-xs font-bold capitalize text-ink/50 lg:inline-flex">
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
