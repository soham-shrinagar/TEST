import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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

const OFFER_TYPE_LABELS = {
  free_meal: '🍽️ Free Meal',
  flat_fee: '💰 Flat Fee',
  discount_voucher: '🎟️ Voucher',
  combo: '🤝 Meal + Fee',
};

const StarRating = ({ value }) => (
  <span className="text-[#f59e0b]">
    {'★'.repeat(Math.round(value))}{'☆'.repeat(5 - Math.round(value))}
  </span>
);

const StoreProfilePage = () => {
  const { storeId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/store/${storeId}/profile`)
      .then(({ data: result }) => setData(result))
      .catch((err) => setError(err.response?.data?.message || 'Could not load store profile'))
      .finally(() => setLoading(false));
  }, [storeId]);

  if (loading) {
    return (
      <div className="page-shell">
        <div className="h-48 animate-pulse rounded-xl bg-ink/[0.06]" />
        <div className="mt-6 h-48 animate-pulse rounded-lg border border-ink/10 bg-white" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-shell">
        <div className="panel p-8 text-center font-bold text-[#a8322b]">
          {error || 'Store not found'}
        </div>
      </div>
    );
  }

  const { store, activeDeal, completedDeals, reviews } = data;
  const sp = store?.storeProfile || {};

  return (
    <div className="page-shell">
      {/* Cover + logo header */}
      <div className="overflow-hidden rounded-xl border border-ink/10">
        {sp.coverImage ? (
          <img src={sp.coverImage} alt={sp.storeName} className="h-52 w-full object-cover" />
        ) : (
          <div className="h-52 bg-gradient-to-br from-[#4140c8] to-[#8b5cf6]" />
        )}
        <div className="flex flex-wrap items-end gap-5 px-5 pb-5 -mt-10">
          {sp.logoImage ? (
            <img
              src={sp.logoImage}
              alt=""
              className="h-20 w-20 shrink-0 rounded-full border-4 border-white object-cover shadow"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#4140c8] text-2xl font-extrabold text-white shadow">
              {(sp.storeName || 'S').slice(0, 1)}
            </div>
          )}
          <div className="pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold text-ink">{sp.storeName || store?.name}</h1>
              {sp.storeVerified && (
                <span className="rounded-full bg-[#e9ebff] px-2 py-0.5 text-xs font-bold text-[#4140c8]">
                  ✓ Verified
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink/50">
              {sp.storeType && <span>{STORE_TYPE_LABELS[sp.storeType] || sp.storeType}</span>}
              {sp.address?.city && <span>📍 {sp.address.city}</span>}
              {sp.averageRating > 0 && (
                <span className="font-bold text-[#f59e0b]">
                  ★ {sp.averageRating} ({sp.totalReviews} review{sp.totalReviews !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-5">
          {/* About */}
          {sp.description && (
            <section className="panel p-5">
              <h2 className="text-xl font-extrabold">About</h2>
              <p className="mt-3 text-sm leading-6 text-ink/60">{sp.description}</p>
            </section>
          )}

          {/* Active deal */}
          {activeDeal && (
            <section className="panel p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-extrabold">Current Deal</h2>
                <span className="rounded-full bg-[#d9f7ec] px-3 py-1 text-xs font-extrabold text-[#0f7655]">
                  Active
                </span>
              </div>
              <p className="mt-3 font-bold text-ink">{activeDeal.title}</p>
              <p className="mt-1 text-sm leading-6 text-ink/60">{activeDeal.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#e9ebff] px-3 py-1 text-xs font-bold text-[#4140c8]">
                  {OFFER_TYPE_LABELS[activeDeal.offerType] || activeDeal.offerType}
                </span>
                {activeDeal.flatFeeAmount > 0 && (
                  <span className="rounded-full bg-[#d9f7ec] px-3 py-1 text-xs font-bold text-[#0f7655]">
                    INR {activeDeal.flatFeeAmount?.toLocaleString('en-IN')} cash
                  </span>
                )}
              </div>
              <Link to={`/creator/store-visits/${activeDeal._id}`} className="btn-primary mt-4 inline-flex">
                View &amp; Apply
              </Link>
            </section>
          )}

          {/* Creator reviews */}
          {reviews?.length > 0 && (
            <section className="panel p-5">
              <h2 className="text-xl font-extrabold">
                Creator Reviews
                {sp.averageRating > 0 && (
                  <span className="ml-3 text-base font-bold text-ink/50">
                    ★ {sp.averageRating} · {sp.totalReviews} review{sp.totalReviews !== 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              <div className="mt-4 space-y-4">
                {reviews.map((rev) => (
                  <div key={rev._id} className="border-t border-ink/10 pt-4 first:border-t-0 first:pt-0">
                    <div className="flex items-center gap-3">
                      {rev.creator?.instagram_profile_pic || rev.creator?.profile_pic ? (
                        <img
                          src={rev.creator.instagram_profile_pic || rev.creator.profile_pic}
                          alt={rev.creator?.name}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-white">
                          {(rev.creator?.name || 'C').slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-extrabold">{rev.creator?.name || 'Creator'}</p>
                        <StarRating value={rev.review.rating} />
                      </div>
                    </div>
                    {rev.review.comment && (
                      <p className="mt-2 text-sm leading-6 text-ink/60">{rev.review.comment}</p>
                    )}
                    <p className="mt-1 text-xs text-ink/35">
                      {new Date(rev.review.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Past deals */}
          {completedDeals?.length > 0 && (
            <section className="panel p-5">
              <h2 className="text-xl font-extrabold">Past Deals</h2>
              <div className="mt-4 space-y-3">
                {completedDeals.map((deal) => (
                  <div key={deal._id} className="flex items-center justify-between gap-3 rounded-lg bg-[#f4f4f4] px-4 py-3">
                    <div>
                      <p className="text-sm font-bold">{deal.title}</p>
                      <p className="text-xs text-ink/45">{deal.stats?.totalPostsLive || 0} posts live</p>
                    </div>
                    <span className="rounded-full bg-[#e9ebff] px-2.5 py-1 text-xs font-bold text-[#4140c8]">
                      Completed
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="panel p-5">
            <h2 className="text-xl font-extrabold">Store Info</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {sp.openingHours && (
                <div><dt className="label">Hours</dt><dd className="font-bold">{sp.openingHours}</dd></div>
              )}
              {sp.averageSpend && (
                <div><dt className="label">Avg spend</dt><dd className="font-bold">{sp.averageSpend}</dd></div>
              )}
              {sp.contactPhone && (
                <div><dt className="label">Phone</dt><dd className="font-bold">{sp.contactPhone}</dd></div>
              )}
              {sp.instagramHandle && (
                <div>
                  <dt className="label">Instagram</dt>
                  <dd className="font-bold text-[#4140c8]">{sp.instagramHandle}</dd>
                </div>
              )}
              {sp.websiteUrl && (
                <div>
                  <dt className="label">Website</dt>
                  <dd>
                    <a href={sp.websiteUrl} target="_blank" rel="noreferrer" className="font-bold text-[#4140c8] truncate block">
                      {sp.websiteUrl.replace(/^https?:\/\//, '')}
                    </a>
                  </dd>
                </div>
              )}
              {sp.address?.city && (
                <div>
                  <dt className="label">Address</dt>
                  <dd className="font-bold">
                    {[sp.address.street, sp.address.city, sp.address.state].filter(Boolean).join(', ')}
                  </dd>
                  {sp.address.googleMapsLink && (
                    <a href={sp.address.googleMapsLink} target="_blank" rel="noreferrer" className="mt-1 block text-xs font-bold text-[#4140c8]">
                      Open in Maps →
                    </a>
                  )}
                </div>
              )}
            </dl>
          </div>

          <div className="panel p-5">
            <h2 className="text-xl font-extrabold">Stats</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="label">Deals posted</dt><dd className="text-2xl font-extrabold">{sp.totalDealsPosted || 0}</dd></div>
              <div><dt className="label">Creators worked with</dt><dd className="text-2xl font-extrabold">{sp.totalCreatorsWorkedWith || 0}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreProfilePage;
