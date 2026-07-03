import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Badge, money, daysUntil } from '../../components/campaignUtils';

const OFFER_TYPE_LABELS = {
  free_meal: '🍽️ Free Meal',
  flat_fee: '💰 Flat Fee',
  discount_voucher: '🎟️ Voucher',
  combo: '🤝 Meal + Fee',
};

const CAMPAIGN_STATUS_LABELS = {
  pending: 'Awaiting review',
  accepted: 'Accepted — submit content',
  rejected: 'Not selected',
  completed: 'Completed',
};

const STORE_STATUS_LABELS = {
  pending: 'Awaiting review',
  accepted: 'Accepted — book your visit',
  visited: 'Visited — submit content',
  completed: 'Completed',
};

// ─── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent }) => (
  <div className="panel p-5">
    <p className="label">{label}</p>
    <p className={`mt-2 text-4xl font-extrabold tracking-tight ${accent || 'text-ink'}`}>{value}</p>
    {sub && <p className="mt-1 text-sm font-bold text-ink/45">{sub}</p>}
  </div>
);

// ─── Active campaign row ───────────────────────────────────────────────────────
const CampaignRow = ({ application }) => {
  const campaign = application.campaign;
  if (!campaign) return null;
  const daysLeft = daysUntil(campaign.contentDeadline);
  return (
    <article className="flex items-center gap-4 rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-white">
        {(campaign.title || 'C').slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold text-ink">{campaign.title}</p>
        <p className="text-sm text-ink/45">{campaign.brand?.name || 'Brand'}</p>
        <p className="mt-1 text-xs font-bold text-ink/50">
          {CAMPAIGN_STATUS_LABELS[application.status] || application.status}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Badge status={application.status} />
        {daysLeft != null && (
          <p className={`text-xs font-bold ${daysLeft < 3 ? 'text-[#a8322b]' : 'text-ink/40'}`}>
            {daysLeft}d left
          </p>
        )}
        {application.status === 'accepted' && (
          <Link
            to={`/creator/campaigns/${application._id}/workspace`}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            Workspace →
          </Link>
        )}
      </div>
    </article>
  );
};

// ─── Active store visit row ────────────────────────────────────────────────────
const StoreVisitRow = ({ application }) => {
  const deal = application.storeDeal;
  if (!deal) return null;
  const store = deal.store;
  return (
    <article className="flex items-center gap-4 rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#4140c8] text-sm font-extrabold text-white">
        {(store?.storeProfile?.storeName || deal.title || 'S').slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold text-ink">{deal.title}</p>
        <p className="text-sm text-ink/45">
          {store?.storeProfile?.storeName || 'Store'}
          {deal.offerType && <span className="ml-2">{OFFER_TYPE_LABELS[deal.offerType]}</span>}
        </p>
        <p className="mt-1 text-xs font-bold text-ink/50">
          {STORE_STATUS_LABELS[application.status] || application.status}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Badge status={application.status} />
        {deal.flatFeeAmount > 0 && (
          <p className="text-xs font-bold text-[#0f7655]">{money(deal.flatFeeAmount)}</p>
        )}
        {(application.status === 'accepted' || application.status === 'visited') && (
          <Link
            to={`/creator/store-visits/${deal._id}`}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            Workspace →
          </Link>
        )}
      </div>
    </article>
  );
};

// ─── Main dashboard ────────────────────────────────────────────────────────────
const InfluencerDashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' | 'visits'

  useEffect(() => {
    api.get('/analytics/creator-dashboard')
      .then(({ data }) => setStats(data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const displayName = user?.display_name || user?.name || 'Creator';

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="border-b border-ink/10 pb-6">
        <div className="eyebrow">Creator</div>
        <h1 className="mt-4 page-title">
          Hey, {displayName.split(' ')[0]} 👋
        </h1>
        <p className="page-lead">Your campaigns, store visits, and earnings — all in one place.</p>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-4 py-3 text-sm font-bold text-[#a8322b]">
          {error}
        </div>
      )}

      {/* Stats grid */}
      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border border-ink/10 bg-white" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Brand campaigns applied"
              value={stats.totalApplications}
              sub={`${stats.acceptedApplications} accepted · ${stats.pendingApplications} pending`}
            />
            <StatCard
              label="Store visits applied"
              value={stats.totalStoreApplications}
              sub={`${stats.acceptedStoreVisits} active · ${stats.completedStoreVisits} done`}
            />
            <StatCard
              label="Posts live"
              value={stats.postsLive}
              sub="Approved & published"
              accent="text-[#4140c8]"
            />
            <StatCard
              label="Total earnings"
              value={stats.totalEarnings > 0 ? money(stats.totalEarnings) : '—'}
              sub="From paid campaigns"
              accent="text-[#0f7655]"
            />
          </div>

          {/* My Work section */}
          <div className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-5">
              <h2 className="text-2xl font-extrabold text-ink">My Work</h2>
              <Link to="/creator/deals" className="btn-primary text-sm">
                Find more deals →
              </Link>
            </div>

            {/* Tab switcher */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('campaigns')}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  activeTab === 'campaigns' ? 'bg-ink text-white' : 'border border-ink/10 bg-white text-ink/55'
                }`}
              >
                📣 Brand Campaigns
                {stats.activeCampaigns?.length > 0 && (
                  <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                    {activeTab === 'campaigns' ? stats.activeCampaigns.length : <span className="text-ink/55">{stats.activeCampaigns.length}</span>}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('visits')}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  activeTab === 'visits' ? 'bg-ink text-white' : 'border border-ink/10 bg-white text-ink/55'
                }`}
              >
                ☕ Store Visits
                {stats.activeStoreVisits?.length > 0 && (
                  <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                    {stats.activeStoreVisits.length}
                  </span>
                )}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {activeTab === 'campaigns' ? (
                stats.activeCampaigns?.length ? (
                  stats.activeCampaigns.map((app) => (
                    <CampaignRow key={app._id} application={app} />
                  ))
                ) : (
                  <div className="panel p-10 text-center">
                    <p className="text-xl font-extrabold text-ink">No active campaigns</p>
                    <p className="mt-2 text-sm font-bold text-ink/45">
                      Apply to brand campaigns and they'll appear here.
                    </p>
                    <Link to="/creator/deals" className="btn-primary mt-5 inline-flex">
                      Browse Campaigns
                    </Link>
                  </div>
                )
              ) : (
                stats.activeStoreVisits?.length ? (
                  stats.activeStoreVisits.map((app) => (
                    <StoreVisitRow key={app._id} application={app} />
                  ))
                ) : (
                  <div className="panel p-10 text-center">
                    <p className="text-xl font-extrabold text-ink">No active store visits</p>
                    <p className="mt-2 text-sm font-bold text-ink/45">
                      Apply to store deals and they'll appear here once accepted.
                    </p>
                    <Link to="/creator/deals" className="btn-primary mt-5 inline-flex">
                      Browse Store Deals
                    </Link>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 border-t border-ink/10 pt-8">
            <Link
              to="/creator/deals"
              className="panel p-5 flex items-center gap-4 hover:border-[#4140c8]/30 transition"
            >
              <span className="text-3xl">🔍</span>
              <div>
                <p className="font-extrabold text-ink">Discover Deals</p>
                <p className="text-sm text-ink/45">Brand campaigns + store visits ranked for you</p>
              </div>
            </Link>
            <Link
              to="/profile"
              className="panel p-5 flex items-center gap-4 hover:border-[#4140c8]/30 transition"
            >
              <span className="text-3xl">✏️</span>
              <div>
                <p className="font-extrabold text-ink">Edit Profile</p>
                <p className="text-sm text-ink/45">Keep your Instagram stats fresh</p>
              </div>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default InfluencerDashboardPage;
