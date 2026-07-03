import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { money, daysUntil, Badge } from '../../components/campaignUtils';

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
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-base font-extrabold text-white">
          {(brand.displayName || brand.name || 'B').slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-extrabold text-ink">{brand.displayName || brand.name || 'Brand'}</p>
          <p className="text-sm font-bold text-ink/45">Brand Campaign</p>
        </div>
        {score != null && (
          <span className="ml-auto shrink-0 self-start rounded-full bg-[#d9f7ec] px-2.5 py-1 text-xs font-extrabold text-[#0f7655]">
            {score}% match
          </span>
        )}
      </div>

      <h2 className="mt-4 text-xl font-extrabold text-ink leading-tight">{campaign.title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/58 line-clamp-2">{campaign.description}</p>

      {reasons?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {reasons.slice(0, 2).map((r) => (
            <span key={r} className="rounded-full bg-ink/[0.04] px-2.5 py-1 text-[11px] font-bold text-ink/50">{r}</span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-5 flex items-center justify-between gap-3">
        <div>
          <p className="label">Pay</p>
          <p className="text-xl font-extrabold text-[#0f7655]">{money(campaign.budgetPerCreator)}</p>
        </div>
        {endsIn != null && (
          <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${endsIn < 3 ? 'bg-[#ffe1df] text-[#a8322b]' : 'bg-ink/[0.06] text-ink/55'}`}>
            {endsIn <= 0 ? 'Closing soon' : `${endsIn}d left`}
          </span>
        )}
      </div>

      <Link to={`/creator/deals/${campaign._id}`} className="btn-primary mt-4 text-center">
        View Campaign
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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#4140c8] text-base font-extrabold text-white">
            {(store.storeName || deal.title || 'S').slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-extrabold text-ink">
            {store.storeName || 'Store'}
            {store.storeVerified && <span className="ml-1 text-[#4140c8]">✓</span>}
          </p>
          <p className="text-sm font-bold text-ink/45">{store.city || deal.requirements?.location || 'Local'}</p>
        </div>
        {score != null && (
          <span className="ml-auto shrink-0 self-start rounded-full bg-[#e9ebff] px-2.5 py-1 text-xs font-extrabold text-[#4140c8]">
            {score}% match
          </span>
        )}
      </div>

      <h2 className="mt-4 text-xl font-extrabold text-ink leading-tight">{deal.title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/58 line-clamp-2">{deal.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-[#e9ebff] px-3 py-1 text-xs font-bold text-[#4140c8]">
          {OFFER_TYPE_LABELS[deal.offerType] || deal.offerType}
        </span>
        {deal.flatFeeAmount > 0 && (
          <span className="rounded-full bg-[#d9f7ec] px-3 py-1 text-xs font-bold text-[#0f7655]">
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
        View Deal
      </Link>
    </article>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="h-72 animate-pulse rounded-lg border border-ink/10 bg-white" />
    ))}
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
        <div className="eyebrow">Discover</div>
        <h1 className="mt-4 page-title">All Deals</h1>
        <p className="page-lead max-w-lg">
          Brand campaigns and local store visits — ranked for you, all in one place.
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
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                typeFilter === opt.value
                  ? 'bg-ink text-white'
                  : 'border border-ink/10 bg-white text-ink/55 hover:border-ink/25 hover:text-ink'
              }`}
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
          <div className="panel p-12 text-center">
            <p className="text-2xl font-extrabold text-ink">Nothing matches your filters</p>
            <p className="mt-3 text-sm font-bold text-ink/45">
              Try removing the niche or city filter, or switch between campaigns and store visits.
            </p>
            {hasFilters && (
              <button
                type="button"
                className="btn-primary mt-6"
                onClick={() => { setTypeFilter(''); setNiche(''); setCity(''); }}
              >
                Clear all filters
              </button>
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
