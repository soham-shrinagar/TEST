import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

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

const STORE_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  ...Object.entries(STORE_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const StoreCard = ({ store }) => (
  <Link to={`/store/${store._id}`} className="panel group flex flex-col overflow-hidden transition hover:shadow-md">
    <div className="relative h-36 bg-gradient-to-br from-[#4140c8] to-[#8b5cf6]">
      {store.coverImage && (
        <img src={store.coverImage} alt="" className="h-full w-full object-cover" />
      )}
      {store.hasActiveDeal && (
        <span className="absolute right-3 top-3 rounded-full bg-[#d9f7ec] px-2.5 py-1 text-xs font-extrabold text-[#0f7655]">
          Deal Open
        </span>
      )}
    </div>
    <div className="flex flex-1 gap-4 p-4">
      {store.logoImage ? (
        <img src={store.logoImage} alt="" className="h-12 w-12 shrink-0 -mt-8 rounded-full border-2 border-white object-cover" />
      ) : (
        <div className="flex h-12 w-12 shrink-0 -mt-8 items-center justify-center rounded-full border-2 border-white bg-[#4140c8] text-lg font-extrabold text-white">
          {(store.storeName || 'S').slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-ink truncate">
          {store.storeName}
          {store.storeVerified && <span className="ml-1.5 text-[#4140c8]">✓</span>}
        </p>
        <p className="text-xs text-ink/50">
          {STORE_TYPE_LABELS[store.storeType] || store.storeType || 'Store'}
          {store.city && ` · ${store.city}`}
        </p>
        {store.averageRating > 0 && (
          <p className="mt-1 text-xs font-bold text-[#f59e0b]">
            ★ {store.averageRating} ({store.totalReviews})
          </p>
        )}
      </div>
    </div>
  </Link>
);

const BrowseStoresPage = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    storeType: '',
    onlyActive: false,
  });

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.city) params.set('city', filters.city);
    if (filters.storeType) params.set('storeType', filters.storeType);
    if (filters.onlyActive) params.set('onlyActive', 'true');

    api.get(`/store/browse?${params.toString()}`)
      .then(({ data }) => setStores(data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load stores'))
      .finally(() => setLoading(false));
  }, [filters]);

  const setFilter = (key, value) => setFilters((c) => ({ ...c, [key]: value }));

  const activeCount = stores.filter((s) => s.hasActiveDeal).length;

  return (
    <div className="page-shell">
      <div className="border-b border-ink/10 pb-6">
        <div className="eyebrow">Discover</div>
        <h1 className="mt-4 page-title">Browse Stores</h1>
        <p className="page-lead">Find local stores offering visits, meals, and experiences in exchange for content.</p>
      </div>

      {/* Filters */}
      <div className="mt-6 grid gap-3 rounded-lg border border-ink/10 bg-white/85 p-4 sm:grid-cols-3">
        <input
          id="browse-stores-city"
          className="field"
          placeholder="City (e.g. Mumbai)"
          value={filters.city}
          onChange={(e) => setFilter('city', e.target.value)}
        />
        <select
          id="browse-stores-type"
          className="field"
          value={filters.storeType}
          onChange={(e) => setFilter('storeType', e.target.value)}
        >
          {STORE_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-ink/10 bg-white px-4 py-3">
          <input
            id="browse-stores-active"
            type="checkbox"
            checked={filters.onlyActive}
            onChange={(e) => setFilter('onlyActive', e.target.checked)}
          />
          <span className="text-sm font-bold">Active deals only</span>
        </label>
      </div>

      {/* Summary line */}
      {!loading && !error && (
        <p className="mt-4 text-sm font-bold text-ink/45">
          {stores.length} store{stores.length !== 1 ? 's' : ''} found
          {activeCount > 0 ? ` · ${activeCount} with active deals` : ''}
        </p>
      )}

      {error ? (
        <div className="mt-5 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-4 py-3 text-sm font-bold text-[#a8322b]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-lg border border-ink/10 bg-white" />
          ))}
        </div>
      ) : stores.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {stores.map((store) => (
            <StoreCard key={store._id} store={store} />
          ))}
        </div>
      ) : (
        <div className="panel mt-6 p-8 text-center">
          <p className="text-2xl font-extrabold">No stores found</p>
          <p className="mt-2 text-sm text-ink/55">
            {filters.city
              ? `No stores in "${filters.city}" yet — try a different city.`
              : 'Try adjusting your filters or check back later.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default BrowseStoresPage;
