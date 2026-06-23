import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const STORE_TYPE_LABELS = {
  cafe: 'Cafe ☕',
  restaurant: 'Restaurant 🍽️',
  retail_store: 'Retail Store 🛍️',
  salon_spa: 'Salon / Spa 💅',
  gym_fitness: 'Gym / Fitness 💪',
  bakery: 'Bakery 🥐',
  bar_lounge: 'Bar / Lounge 🍸',
  bookstore: 'Bookstore 📚',
  clothing_boutique: 'Clothing Boutique 👗',
  other: 'Store',
};

const StatusPill = ({ status }) => {
  const color = status === 'active'
    ? 'bg-[#d9f7ec] text-[#0f7655]'
    : status === 'paused'
      ? 'bg-[#fff1cc] text-[#8a5a00]'
      : status === 'completed'
        ? 'bg-[#e9ebff] text-[#4140c8]'
        : 'bg-ink/[0.06] text-ink/55';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold capitalize ${color}`}>
      {status}
    </span>
  );
};

const Stat = ({ label, value }) => (
  <div className="panel p-5">
    <p className="label">{label}</p>
    <p className="text-3xl font-extrabold text-ink">{value ?? '—'}</p>
  </div>
);

const StoreDashboardPage = () => {
  const { user } = useAuth();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/store/deals')
      .then(({ data }) => setDeals(data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load deals'))
      .finally(() => setLoading(false));
  }, []);

  const activeDeal = deals.find((d) => d.status === 'active');
  const sp = user?.storeProfile || {};
  const profileComplete = Boolean(sp.storeName && sp.storeType && sp.address?.city && sp.description);
  const completedDeals = deals.filter((d) => d.status === 'completed').length;
  const totalApplications = deals.reduce((sum, d) => sum + (d.stats?.totalApplications || 0), 0);
  const totalPostsLive = deals.reduce((sum, d) => sum + (d.stats?.totalPostsLive || 0), 0);

  return (
    <div className="page-shell">
      <div className="border-b border-ink/10 pb-6">
        <div className="eyebrow">Store</div>
        <h1 className="mt-4 page-title">
          {sp.storeName || user?.name || 'My Store'}
        </h1>
        <p className="page-lead">
          {sp.storeType ? STORE_TYPE_LABELS[sp.storeType] || sp.storeType : ''}{sp.address?.city ? ` · ${sp.address.city}` : ''}
        </p>
      </div>

      {/* Onboarding checklist */}
      {!profileComplete && (
        <div className="mt-6 rounded-lg border border-[#ffbd4a]/40 bg-[#fffbf0] p-5">
          <p className="font-extrabold text-[#7a4d00]">Complete your profile to attract creators</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {!sp.storeName && <span className="rounded-full bg-[#ffbd4a]/20 px-3 py-1 text-xs font-bold text-[#7a4d00]">Add store name</span>}
            {!sp.storeType && <span className="rounded-full bg-[#ffbd4a]/20 px-3 py-1 text-xs font-bold text-[#7a4d00]">Set store type</span>}
            {!sp.address?.city && <span className="rounded-full bg-[#ffbd4a]/20 px-3 py-1 text-xs font-bold text-[#7a4d00]">Add city</span>}
            {!sp.description && <span className="rounded-full bg-[#ffbd4a]/20 px-3 py-1 text-xs font-bold text-[#7a4d00]">Write a description</span>}
          </div>
          <Link to="/store/profile/edit" className="btn-primary mt-4 inline-flex">Edit Profile</Link>
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active Deal" value={activeDeal ? '1 live' : 'None'} />
        <Stat label="Total Applications" value={totalApplications} />
        <Stat label="Posts Live" value={totalPostsLive} />
        <Stat label="Deals Completed" value={completedDeals} />
      </div>

      {/* Active deal card */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-extrabold text-ink">Active Deal</h2>
          {!activeDeal && (
            <Link to="/store/deals/new" className="btn-primary">Post a Deal</Link>
          )}
        </div>

        {loading ? (
          <div className="panel mt-4 h-40 animate-pulse" />
        ) : activeDeal ? (
          <Link to={`/store/deals/${activeDeal._id}`} className="panel mt-4 flex items-start justify-between gap-5 p-5 transition hover:shadow-md">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-extrabold text-ink">{activeDeal.title}</h3>
                <StatusPill status={activeDeal.status} />
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/60">{activeDeal.description}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold text-ink/60">
                <span>👥 {activeDeal.stats?.totalApplications || 0} applications</span>
                <span>✅ {activeDeal.stats?.totalAccepted || 0} accepted</span>
                <span>📸 {activeDeal.stats?.totalPostsLive || 0} posts live</span>
                <span>📍 {activeDeal.requirements?.location || 'Any city'}</span>
              </div>
            </div>
            <span className="shrink-0 rounded-lg bg-ink/[0.04] px-4 py-2 text-sm font-extrabold text-ink">Manage →</span>
          </Link>
        ) : (
          <div className="panel mt-4 p-8 text-center">
            <p className="text-xl font-extrabold text-ink">No active deal</p>
            <p className="mt-2 text-sm text-ink/55">Post a deal to start attracting local creators to your store.</p>
            <Link to="/store/deals/new" className="btn-primary mt-4 inline-flex">Post your first deal</Link>
          </div>
        )}
      </section>

      {/* Past deals */}
      {deals.filter((d) => d.status !== 'active').length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-extrabold text-ink">Past Deals</h2>
          <div className="panel overflow-x-auto p-5">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-ink/45">
                <tr>
                  <th className="py-3">Deal</th>
                  <th>Status</th>
                  <th>Applications</th>
                  <th>Posts Live</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deals.filter((d) => d.status !== 'active').map((deal) => (
                  <tr key={deal._id} className="border-t border-ink/10">
                    <td className="py-3 font-bold">{deal.title}</td>
                    <td><StatusPill status={deal.status} /></td>
                    <td>{deal.stats?.totalApplications || 0}</td>
                    <td>{deal.stats?.totalPostsLive || 0}</td>
                    <td>
                      <Link to={`/store/deals/${deal._id}`} className="btn-secondary px-3 py-1.5">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {error ? <div className="mt-6 text-sm font-bold text-[#a8322b]">{error}</div> : null}
    </div>
  );
};

export default StoreDashboardPage;
