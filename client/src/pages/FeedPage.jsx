import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import RecommendedCampaignCard from '../components/RecommendedCampaignCard';
import RecommendedCreatorCard from '../components/RecommendedCreatorCard';
import { useAuth } from '../context/AuthContext';
import useRecommendations from '../hooks/useRecommendations';

const INTEREST_OPTIONS = ['Lifestyle', 'Sports', 'Fashion', 'Travel', 'Tech', 'Food & Beverage', 'Gaming', 'Health & Fitness', 'Beauty', 'Finance', 'Education', 'Entertainment', 'Parenting', 'Automotive', 'Pets'];
const AVAILABILITY_OPTIONS = ['Paid only', 'Gifting only', 'Both'];
const BUDGET_OPTIONS = ['Micro (< ₹10k)', 'Mid (₹10k–₹50k)', 'Premium (₹50k+)'];
const CAMPAIGN_TYPE_OPTIONS = ['Story mention', 'Dedicated post', 'Long-term ambassador', 'Event coverage', 'Product review', 'Reel/Short video', 'Blog/Article'];

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

const defaultFilters = {
  sort: 'recommended',
  priority: 'balanced',
  location: '',
  niche: '',
  availability: '',
  budgetTier: '',
  campaignType: '',
};

const activeFilterCount = (filters) => Object.entries(filters).filter(
  ([key, value]) => value && !['sort', 'priority'].includes(key),
).length;

const FeedPage = () => {
  const { user } = useAuth();
  const isBrand = user?.role === 'brand';
  const [profiles, setProfiles] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
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

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  const fetchFeed = async () => {
    setLoading(true);
    setError('');
    try {
      if (isBrand) {
        const { data } = await api.get(`/recommendations/discover${queryString ? `?${queryString}` : ''}`);
        setProfiles(data);
        setCampaigns([]);
      } else {
        const { data } = await api.get('/campaigns/discover?sort=newest');
        setCampaigns(data);
        setProfiles([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your discovery feed');
    } finally {
      setLoading(false);
    }
  };

  // Two-layer data strategy:
  // 1. fetchFeed() — loads the primary list (profiles for brands, campaigns for creators)
  //    using role-specific filters and sort from the filter bar.
  // 2. useRecommendations() — runs a personalised scoring pass in parallel and enriches
  //    the primary list with score/reasons. Results are merged client-side by userId/campaignId.
  //    If the hook hasn't loaded yet, the primary list is shown without scores.
  useEffect(() => {
    fetchFeed();
  }, [queryString, isBrand]);

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

  const recommendedCampaigns = useMemo(() => (
    recommendations.filter((recommendation) => recommendation.targetModel === 'Campaign' && recommendation.target)
  ), [recommendations]);

  const displayedCampaigns = recommendedCampaigns.length
    ? recommendedCampaigns
    : campaigns.map((campaign) => ({
      targetId: campaign._id,
      targetModel: 'Campaign',
      target: campaign,
      score: null,
      reasons: [],
    }));
  const waitingForBrandScores = isBrand
    && filters.sort === 'recommended'
    && recommendationsLoading
    && !displayedProfiles.some((profile) => profile.score !== null && profile.score !== undefined);

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
              Matched profiles ranked by niche fit. Refine with sort, location, and campaign filters.
            </p>
          </div>
          <button type="button" onClick={fetchFeed} className="btn-secondary w-fit shrink-0">
            Refresh
          </button>
        </div>

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
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                className="field"
                value={filters.priority}
                onChange={(event) => updateFilter('priority', event.target.value)}
                aria-label="Match priority"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
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
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <select
                className="field"
                value={filters.availability}
                onChange={(event) => updateFilter('availability', event.target.value)}
              >
                <option value="">Any availability</option>
                {AVAILABILITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <select
                className="field"
                value={filters.budgetTier}
                onChange={(event) => updateFilter('budgetTier', event.target.value)}
              >
                <option value="">Any budget</option>
                {BUDGET_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <select
                className="field"
                value={filters.campaignType}
                onChange={(event) => updateFilter('campaignType', event.target.value)}
              >
                <option value="">Any collaboration</option>
                {CAMPAIGN_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
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
      </div>

      <div className="mx-auto mt-8 max-w-5xl">
        {error ? (
          <div className="mb-4 rounded-lg border border-[#ff7a1a]/25 bg-[#fff5ec] px-4 py-3 text-sm font-bold text-[#b64c00]">
            {error}
          </div>
        ) : null}

        {loading || waitingForBrandScores || (!isBrand && recommendationsLoading && !displayedCampaigns.length) ? (
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
        ) : !isBrand && displayedCampaigns.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {displayedCampaigns.map((recommendation) => (
              <RecommendedCampaignCard
                key={recommendation.targetId}
                recommendation={recommendation}
                registerView={recommendation.score === null ? undefined : registerView}
                onTrack={trackEvent}
              />
            ))}
          </div>
        ) : (
          <div className="panel w-full p-8 text-center">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-ink">
              No profiles match
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/58">
              Try clearing filters or check back later for new collaborators.
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
