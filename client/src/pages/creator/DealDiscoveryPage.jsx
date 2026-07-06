import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { money, daysUntil } from '../../components/campaignUtils';
import FitToken from '../../components/lineup/FitToken';
import EmptyState from '../../components/lineup/EmptyState';
import LineupScene from '../../components/lineup/LineupScene';
import { lineupCopy } from '../../constants/lineupCopy';

const NICHES = [
  'Lifestyle', 'Sports', 'Fashion', 'Travel', 'Tech',
  'Food & Beverage', 'Gaming', 'Health & Fitness', 'Beauty',
  'Finance', 'Education', 'Entertainment', 'Cafe Hopping',
  'Food Review', 'Local Exploration',
];

const OFFER_TYPE_LABELS = {
  free_meal: '🍽️ Free Meal',
  flat_fee: '💰 Flat Fee',
  discount_voucher: '🎟️ Voucher',
  combo: '🤝 Meal + Fee',
};

// ─── Campaign card ─────────────────────────────────────────────────────────────
const CampaignCard = ({ item }) => {
  const { data: campaign, score, reasons } = item;
  const brand = campaign.brandProfile || campaign.brand || {};
  const endsIn = daysUntil(campaign.applicationDeadline);

  return (
    <article className="panel flex flex-col p-5">
      <div className="flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-ink font-display text-base uppercase text-paper">
          {(brand.displayName || brand.name || 'B').slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-extrabold text-ink">{brand.displayName || brand.name || 'Brand'}</p>
          <p className="text-sm font-bold text-inkSoft">{lineupCopy.campaign}</p>
        </div>
        {score != null && (
          <div className="ml-auto shrink-0 self-start">
            <FitToken score={score} label="Fit" />
          </div>
        )}
      </div>

      <h2 className="mt-4 text-xl font-extrabold text-ink leading-tight">{campaign.title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/58 line-clamp-2">{campaign.description}</p>

      {reasons?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {reasons.slice(0, 2).map((r) => (
            <span key={r} className="bg-accent px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-paper">{r}</span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-5 flex items-center justify-between gap-3">
        <div>
          <p className="label">Pay</p>
          <p className="font-mono-data text-xl font-extrabold text-ink">{money(campaign.budgetPerCreator)}</p>
        </div>
        {endsIn != null && (
          <span className={`px-3 py-1 font-mono text-xs font-extrabold uppercase ${endsIn < 3 ? 'bg-accent text-paper' : 'border border-ink text-inkSoft'}`}>
            {endsIn <= 0 ? 'Closing soon' : `${endsIn}d left`}
          </span>
        )}
      </div>

      <Link to={`/creator/deals/${campaign._id}`} className="btn-primary mt-4 text-center">
        View {lineupCopy.campaign}
      </Link>
    </article>
  );
};

// ─── Store deal card ───────────────────────────────────────────────────────────
const StoreDealCard = ({ item }) => {
  const { data: deal, score, reasons } = item;
  const store = deal.storeInfo || {};
  const spotsLeft = deal.spotsRemaining ?? deal.requirements?.maxCreators ?? 5;

  return (
    <article className="panel flex flex-col p-5">
      <div className="flex gap-3">
        {store.logoImage ? (
          <img src={store.logoImage} alt={store.storeName} className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-ink font-display text-base uppercase text-paper">
            {(store.storeName || deal.title || 'S').slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-extrabold text-ink">
            {store.storeName || 'Store'}
            {store.storeVerified && <span className="ml-1 text-accent">✓</span>}
          </p>
          <p className="text-sm font-bold text-inkSoft">{store.city || deal.requirements?.location || 'Local'}</p>
        </div>
        {score != null && (
          <div className="ml-auto shrink-0 self-start">
            <FitToken score={score} label="Fit" />
          </div>
        )}
      </div>

      <h2 className="mt-4 text-xl font-extrabold text-ink leading-tight">{deal.title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/58 line-clamp-2">{deal.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="bg-accent px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-paper">
          {OFFER_TYPE_LABELS[deal.offerType] || deal.offerType}
        </span>
        {deal.flatFeeAmount > 0 && (
          <span className="border border-ink px-3 py-1 font-mono text-xs font-bold text-ink">
            {money(deal.flatFeeAmount)}
          </span>
        )}
        {reasons?.slice(0, 1).map((r) => (
          <span key={r} className="rounded-full bg-ink/[0.04] px-2.5 py-1 text-[11px] font-bold text-ink/50">{r}</span>
        ))}
      </div>

      <div className="mt-auto pt-5 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-ink/45">{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</p>
        {store.averageRating > 0 && (
          <p className="text-xs font-bold text-[#f59e0b]">★ {store.averageRating}</p>
        )}
      </div>

      <Link to={`/creator/store-deals/${deal._id}`} className="btn-primary mt-4 text-center">
        View {lineupCopy.deal}
      </Link>
    </article>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="flex justify-center py-16">
    <LineupScene mode="loading" />
  </div>
);

// ─── Main page ─────────────────────────────────────────────────────────────────
const DealDiscoveryPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');   // '' | 'campaign' | 'store_deal'
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (niche) params.set('niche', niche);
    if (city) params.set('city', city);
    params.set('limit', '18');
    params.set('page', String(page));
    return params.toString();
  }, [typeFilter, niche, city, page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [typeFilter, niche, city]);

  useEffect(() => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');

    api.get(`/feed/discover?${queryString}`)
      .then(({ data }) => {
        if (page === 1) {
          setItems(data.items || []);
        } else {
          setItems((prev) => [...prev, ...(data.items || [])]);
        }
        setHasMore(data.hasMore || false);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load deals'))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [queryString]);

  const hasFilters = typeFilter || niche || city;

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="border-b border-ink/10 pb-6">
        <div className="eyebrow">{lineupCopy.discover}</div>
        <h1 className="mt-4 page-title">The Bill</h1>
        <p className="page-lead max-w-lg">
          Brand shows and local opening slots — ranked for you, all in one place.
        </p>
      </div>

      {/* Filter bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {/* Type toggle */}
        <div className="flex gap-2">
          {[
            { value: '', label: 'All' },
            { value: 'campaign', label: '📣 Campaigns' },
            { value: 'store_deal', label: '☕ Store Visits' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTypeFilter(opt.value)}
              className={`tab-pill ${typeFilter === opt.value ? 'tab-pill-active' : 'tab-pill-inactive'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select
          className="field sm:w-48"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          aria-label="Niche filter"
        >
          <option value="">All niches</option>
          {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>

        <input
          className="field sm:w-48"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City…"
          aria-label="City filter"
        />

        {hasFilters && (
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => { setTypeFilter(''); setNiche(''); setCity(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mt-8">
        {error && (
          <div className="mb-6 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-4 py-3 text-sm font-bold text-[#a8322b]">
            {error}
          </div>
        )}

        {loading ? (
          <Skeleton />
        ) : items.length === 0 ? (
          <div>
            <EmptyState title="This slot's still open." message="Try removing the niche or city filter, or switch between shows and opening slots." />
            {hasFilters && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => { setTypeFilter(''); setNiche(''); setCity(''); }}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item, i) =>
                item.type === 'campaign' ? (
                  <CampaignCard key={`c-${item.data._id}-${i}`} item={item} />
                ) : (
                  <StoreDealCard key={`d-${item.data._id}-${i}`} item={item} />
                )
              )}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={loadingMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DealDiscoveryPage;
