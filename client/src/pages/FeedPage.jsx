import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import RecommendedCampaignCard from '../components/RecommendedCampaignCard';
import RecommendedCreatorCard from '../components/RecommendedCreatorCard';
import { useAuth } from '../context/AuthContext';
import useRecommendations from '../hooks/useRecommendations';
import { daysUntil, money } from '../components/campaignUtils';

// ─── Filter options ────────────────────────────────────────────────────────────

const INTEREST_OPTIONS = ['Lifestyle', 'Sports', 'Fashion', 'Travel', 'Tech', 'Food & Beverage', 'Gaming', 'Health & Fitness', 'Beauty', 'Finance', 'Education', 'Entertainment', 'Parenting', 'Automotive', 'Pets'];
const AVAILABILITY_OPTIONS = ['Paid only', 'Gifting only', 'Both'];
const BUDGET_OPTIONS = ['Micro (< ₹10k)', 'Mid (₹10k–₹50k)', 'Premium (₹50k+)'];
const CAMPAIGN_TYPE_OPTIONS = ['Story mention', 'Dedicated post', 'Long-term ambassador', 'Event coverage', 'Product review', 'Reel/Short video', 'Blog/Article'];
const OFFER_TYPE_LABELS = {
  free_meal: '🍽️ Free Meal',
  flat_fee: '💰 Flat Fee',
  discount_voucher: '🎟️ Voucher',
  combo: '🤝 Meal + Fee',
};

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Best match' },
  { value: 'followers', label: 'Followers' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'budget', label: 'Budget' },
  { value: 'location', label: 'Location' },
  { value: 'recent', label: 'Newest' },
];

const PRIORITY_OPTIONS = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'niche', label: 'Niche' },
  { value: 'money', label: 'Budget' },
  { value: 'collab', label: 'Collab type' },
  { value: 'requirements', label: 'Requirements' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'campaign', label: '📣 Brand Campaigns' },
  { value: 'store_deal', label: '☕ Store Visits' },
];

const defaultFilters = {
  sort: 'recommended',
  priority: 'balanced',
  location: '',
  niche: '',
  availability: '',
  budgetTier: '',
  campaignType: '',
  type: '',
};

const activeFilterCount = (filters) =>
  Object.entries(filters).filter(([key, value]) => value && !['sort', 'priority'].includes(key)).length;

// ─── Inline store deal card ────────────────────────────────────────────────────

const StoreDealCard = ({ item }) => {
  const { data: deal, score, reasons } = item;
  const spotsLeft = deal.spotsRemaining ?? deal.requirements?.maxCreators ?? 5;
  const applied = deal.applicationStatus;

  return (
    <article className="panel p-5">
      <div className="flex gap-4">
        {deal.storeInfo?.logoImage ? (
          <img
            src={deal.storeInfo.logoImage}
            alt={deal.storeInfo.storeName}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#4140c8] text-xl font-extrabold text-white">
            {(deal.storeInfo?.storeName || deal.title || 'S').slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-extrabold text-ink">
            {deal.storeInfo?.storeName || 'Store'}
            {deal.storeInfo?.storeVerified && <span className="ml-1.5 text-[#4140c8]">✓</span>}
          </p>
          <p className="text-sm font-bold text-ink/45">
            {deal.storeInfo?.city || deal.requirements?.location || 'Local'}
          </p>
        </div>
        {score !== null && score !== undefined && (
          <span className="ml-auto shrink-0 rounded-full bg-[#e9ebff] px-2.5 py-1 text-xs font-extrabold text-[#4140c8]">
            {score}% match
          </span>
        )}
      </div>

      <h2 className="mt-4 text-xl font-extrabold text-ink">{deal.title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/60 line-clamp-2">{deal.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-[#e9ebff] px-3 py-1 text-xs font-bold text-[#4140c8]">
          {OFFER_TYPE_LABELS[deal.offerType] || deal.offerType}
        </span>
        {deal.flatFeeAmount > 0 && (
          <span className="rounded-full bg-[#d9f7ec] px-3 py-1 text-xs font-bold text-[#0f7655]">
            {money(deal.flatFeeAmount)} cash
          </span>
        )}
        {(deal.deliverables?.reels || 0) > 0 && (
          <span className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs font-bold">
            {deal.deliverables.reels} Reel{deal.deliverables.reels > 1 ? 's' : ''}
          </span>
        )}
        {(deal.deliverables?.stories || 0) > 0 && (
          <span className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs font-bold">
            {deal.deliverables.stories} Story
          </span>
        )}
        {(deal.deliverables?.staticPosts || 0) > 0 && (
          <span className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs font-bold">
            {deal.deliverables.staticPosts} Post{deal.deliverables.staticPosts > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {reasons?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {reasons.slice(0, 2).map((reason) => (
            <span key={reason} className="rounded-full bg-ink/[0.04] px-2.5 py-1 text-[11px] font-bold text-ink/50">
              {reason}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-ink/45">
          {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} remaining
        </p>
        {deal.storeInfo?.averageRating > 0 && (
          <p className="text-xs font-bold text-[#f59e0b]">
            ★ {deal.storeInfo.averageRating} ({deal.storeInfo.totalReviews})
          </p>
        )}
      </div>

      <div className="mt-4">
        {applied ? (
          applied === 'accepted' ? (
            <Link to={`/creator/store-visits/${deal._id}`} className="btn-primary w-full">
              Open Workspace
            </Link>
          ) : (
            <button type="button" disabled className="btn-secondary w-full capitalize">
              {applied === 'pending' ? 'Applied — Pending' : applied}
            </button>
          )
        ) : spotsLeft <= 0 ? (
          <button type="button" disabled className="btn-secondary w-full">
            Full
          </button>
        ) : (
          <Link to={`/creator/store-deals/${deal._id}`} className="btn-primary w-full">
            View Deal
          </Link>
        )}
      </div>
    </article>
  );
};

// ─── Inline campaign card (for unified feed) ──────────────────────────────────

const CampaignFeedCard = ({ item }) => {
  const { data: campaign, score, reasons } = item;
  const minFollowers = campaign.requirements?.minFollowers || 0;
  const endsIn = daysUntil(campaign.applicationDeadline);

  return (
    <article className="panel p-5">
      <div className="flex gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-lg font-extrabold text-white">
          {(campaign.brandProfile?.displayName || campaign.brand?.name || 'B').slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-ink">
            {campaign.brandProfile?.displayName || campaign.brand?.name || 'Brand'}
          </p>
          <p className="text-sm font-bold text-ink/45">
            {campaign.brandProfile?.brandCategory || 'Brand campaign'}
          </p>
        </div>
        {score !== null && score !== undefined && (
          <span className="ml-auto shrink-0 rounded-full bg-[#d9f7ec] px-2.5 py-1 text-xs font-extrabold text-[#0f7655]">
            {score}% match
          </span>
        )}
      </div>

      <h2 className="mt-5 text-2xl font-extrabold text-ink">{campaign.title}</h2>

      {reasons?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {reasons.slice(0, 2).map((reason) => (
            <span key={reason} className="rounded-full bg-ink/[0.04] px-2.5 py-1 text-[11px] font-bold text-ink/50">
              {reason}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">Pay per creator</p>
          <p className="text-2xl font-extrabold text-[#0f7655]">{money(campaign.budgetPerCreator)}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-extrabold ${
            endsIn !== null && endsIn < 3 ? 'bg-[#ffe1df] text-[#a8322b]' : 'bg-ink/[0.06] text-ink/55'
          }`}
        >
          {endsIn === null ? 'Deadline open' : `Ends in ${endsIn} days`}
        </span>
      </div>
      <div className="mt-5">
        <Link className="btn-primary w-full" to={`/creator/deals/${campaign._id}`}>
          View Campaign
        </Link>
      </div>
    </article>
  );
};

// ─── Main FeedPage ─────────────────────────────────────────────────────────────

const FeedPage = () => {
  const { user } = useAuth();
  const isBrand = user?.role === 'brand';

  // Brand: creator discovery via recommendation engine
  const [profiles, setProfiles] = useState([]);

  // Creator: unified feed from /api/feed/discover
  const [feedItems, setFeedItems] = useState([]);
  const [feedPage, setFeedPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);

  const {
    recommendations,
    loading: recommendationsLoading,
    registerView,
    trackEvent,
  } = useRecommendations(20);

  // Build querystring for brand discovery
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  // Build querystring for creator unified feed
  const feedQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.niche) params.set('niche', filters.niche);
    if (filters.location) params.set('city', filters.location);
    if (filters.type) params.set('type', filters.type);
    params.set('page', String(feedPage));
    params.set('limit', '20');
    return params.toString();
  }, [filters.niche, filters.location, filters.type, feedPage]);

  const fetchFeed = async () => {
    setLoading(true);
    setError('');
    try {
      if (isBrand) {
        const { data } = await api.get(`/recommendations/discover${queryString ? `?${queryString}` : ''}`);
        setProfiles(data);
      } else {
        // Unified feed — campaigns + store deals scored together
        const { data } = await api.get(`/feed/discover?${feedQueryString}`);
        if (feedPage === 1) {
          setFeedItems(data.items || []);
        } else {
          setFeedItems((prev) => [...prev, ...(data.items || [])]);
        }
        setHasMore(data.hasMore || false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your discovery feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFeedPage(1);
    setFeedItems([]);
  }, [filters.niche, filters.location, filters.type]);

  useEffect(() => {
    fetchFeed();
  }, [queryString, feedQueryString, isBrand]);

  // Brand: enrich profiles with recommendation scores
  const displayedProfiles = useMemo(() => {
    const recommendedByUserId = new Map();
    recommendations.forEach((recommendation) => {
      const profile = recommendation.target;
      const userId = profile?.user?._id || recommendation.targetId;
      if (userId) recommendedByUserId.set(userId.toString(), recommendation);
    });

    const enriched = profiles.map((profile, index) => {
      const userId = profile?.user?._id || profile?.user;
      const recommendation = userId ? recommendedByUserId.get(userId.toString()) : null;
      return recommendation
        ? { ...profile, ...recommendation, target: profile, originalIndex: index }
        : { ...profile, score: null, reasons: [], originalIndex: index };
    });

    if (filters.sort !== 'recommended') return enriched;
    return enriched.sort((left, right) => {
      const scoreDiff = (right.score || 0) - (left.score || 0);
      return scoreDiff || left.originalIndex - right.originalIndex;
    });
  }, [filters.sort, profiles, recommendations]);

  const waitingForBrandScores =
    isBrand &&
    filters.sort === 'recommended' &&
    recommendationsLoading &&
    !displayedProfiles.some((p) => p.score !== null && p.score !== undefined);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setShowFilters(false);
  };

  const extraFilters = activeFilterCount(filters);

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow">Discovery</div>
            <h1 className="mt-3 page-title">Discover</h1>
            <p className="page-lead max-w-xl">
              {isBrand
                ? 'Matched creators ranked by niche fit. Refine with sort, location, and campaign filters.'
                : 'Brand campaigns and store visits ranked for you in one unified feed.'}
            </p>
          </div>
          <button type="button" onClick={fetchFeed} className="btn-secondary w-fit shrink-0">
            Refresh
          </button>
        </div>

        {/* ── Brand filters ── */}
        {isBrand ? (
          <div className="mt-6 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  className="field"
                  value={filters.sort}
                  onChange={(event) => updateFilter('sort', event.target.value)}
                  aria-label="Sort results"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  className="field"
                  value={filters.priority}
                  onChange={(event) => updateFilter('priority', event.target.value)}
                  aria-label="Match priority"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  className="field sm:col-span-2 lg:col-span-2"
                  value={filters.location}
                  onChange={(event) => updateFilter('location', event.target.value)}
                  placeholder="Filter by location"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className="btn-secondary w-full shrink-0 lg:w-auto"
              >
                {showFilters ? 'Hide filters' : 'More filters'}
                {extraFilters ? ` (${extraFilters})` : ''}
              </button>
            </div>

            {showFilters ? (
              <div className="grid gap-3 rounded-lg border border-ink/10 bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  className="field"
                  value={filters.niche}
                  onChange={(event) => updateFilter('niche', event.target.value)}
                >
                  <option value="">All niches</option>
                  {INTEREST_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <select
                  className="field"
                  value={filters.availability}
                  onChange={(event) => updateFilter('availability', event.target.value)}
                >
                  <option value="">Any availability</option>
                  {AVAILABILITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <select
                  className="field"
                  value={filters.budgetTier}
                  onChange={(event) => updateFilter('budgetTier', event.target.value)}
                >
                  <option value="">Any budget</option>
                  {BUDGET_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <select
                  className="field"
                  value={filters.campaignType}
                  onChange={(event) => updateFilter('campaignType', event.target.value)}
                >
                  <option value="">Any collaboration</option>
                  {CAMPAIGN_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                {extraFilters ? (
                  <button type="button" onClick={resetFilters} className="btn-secondary sm:col-span-2 lg:col-span-4">
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Creator unified feed filters ── */}
        {!isBrand ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <select
              className="field"
              value={filters.type}
              onChange={(event) => updateFilter('type', event.target.value)}
              aria-label="Filter by type"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="field"
              value={filters.niche}
              onChange={(event) => updateFilter('niche', event.target.value)}
              aria-label="Filter by niche"
            >
              <option value="">All niches</option>
              {INTEREST_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <input
              className="field"
              value={filters.location}
              onChange={(event) => updateFilter('location', event.target.value)}
              placeholder="City"
              aria-label="Filter by city"
            />

            {extraFilters ? (
              <button type="button" onClick={resetFilters} className="btn-secondary shrink-0">
                Clear
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mx-auto mt-8 max-w-5xl">
        {error ? (
          <div className="mb-4 rounded-lg border border-[#ff7a1a]/25 bg-[#fff5ec] px-4 py-3 text-sm font-bold text-[#b64c00]">
            {error}
          </div>
        ) : null}

        {loading || waitingForBrandScores ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-lg border border-ink/10 bg-white shadow-soft" />
            ))}
          </div>
        ) : isBrand && displayedProfiles.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {displayedProfiles.map((profile) => (
              <RecommendedCreatorCard
                key={profile._id || profile.targetId}
                recommendation={profile}
                registerView={registerView}
                onTrack={trackEvent}
              />
            ))}
          </div>
        ) : !isBrand && feedItems.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {feedItems.map((item, index) =>
                item.type === 'campaign' ? (
                  <CampaignFeedCard key={`campaign-${item.data._id}-${index}`} item={item} />
                ) : (
                  <StoreDealCard key={`deal-${item.data._id}-${index}`} item={item} />
                ),
              )}
            </div>
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={loading}
                  onClick={() => setFeedPage((p) => p + 1)}
                >
                  Load more
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="panel w-full p-8 text-center">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-ink">Nothing here yet</h2>
            <p className="mt-3 text-sm leading-6 text-ink/58">
              {isBrand
                ? 'Try clearing filters or check back later for new collaborators.'
                : 'No campaigns or store deals match your filters right now. Try adjusting your niche or city filter.'}
            </p>
            {extraFilters ? (
              <button type="button" onClick={resetFilters} className="btn-primary mt-6">
                Clear filters
              </button>
            ) : (
              <button type="button" onClick={fetchFeed} className="btn-primary mt-6">
                Refresh feed
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedPage;
