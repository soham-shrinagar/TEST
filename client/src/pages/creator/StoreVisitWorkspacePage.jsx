import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { Badge } from '../../components/campaignUtils';

const OFFER_TYPE_LABELS = {
  free_meal: '🍽️ Free Meal',
  flat_fee: '💰 Flat Fee',
  discount_voucher: '🎟️ Voucher',
  combo: '🤝 Meal + Fee',
};

const StarRating = ({ value, onChange, readOnly = false }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((s) => (
      <button
        key={s}
        type="button"
        onClick={() => !readOnly && onChange?.(s)}
        className={`text-2xl transition ${s <= value ? 'text-[#f59e0b]' : 'text-ink/20'}`}
        disabled={readOnly}
      >
        ★
      </button>
    ))}
  </div>
);

const StoreVisitWorkspacePage = () => {
  const { dealId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitType, setSubmitType] = useState('reel');
  const [postUrl, setPostUrl] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [review, setReview] = useState({ rating: 0, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: result } = await api.get(`/store/workspace/${dealId}`);
      setData(result);
      if (result.application?.review?.rating) {
        setReview({ rating: result.application.review.rating, comment: result.application.review.comment || '' });
        setReviewSubmitted(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [dealId]);

  const submitContent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    try {
      const payload = new FormData();
      payload.append('type', submitType);
      if (postUrl) payload.append('postUrl', postUrl);
      if (screenshotFile) payload.append('screenshotFile', screenshotFile);
      await api.post(`/store/deals/${dealId}/submit`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPostUrl('');
      setScreenshotFile(null);
      setSubmitSuccess('Content submitted successfully!');
      load();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReview = async () => {
    if (!review.rating) return;
    setReviewSubmitting(true);
    try {
      await api.post(`/store/deals/${dealId}/applications/${data.application._id}/review`, review);
      setReviewSubmitted(true);
    } catch {
      // fail silently
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) return <div className="page-shell"><div className="h-96 animate-pulse rounded-lg border border-ink/10 bg-white" /></div>;
  if (error || !data) return <div className="page-shell"><div className="panel p-8 text-center font-bold text-[#a8322b]">{error || 'Workspace not found'}</div></div>;

  const { deal, application, store } = data;
  const sp = store?.storeProfile || {};
  const isCompleted = ['completed', 'visited'].includes(application.status);

  const deliverableSummary = [
    deal.deliverables?.reels > 0 && `${deal.deliverables.reels} Reel${deal.deliverables.reels > 1 ? 's' : ''}`,
    deal.deliverables?.stories > 0 && `${deal.deliverables.stories} Story`,
    deal.deliverables?.staticPosts > 0 && `${deal.deliverables.staticPosts} Post${deal.deliverables.staticPosts > 1 ? 's' : ''}`,
    deal.deliverables?.googleReview && 'Google Review',
  ].filter(Boolean);

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="mb-6 overflow-hidden rounded-xl border border-ink/10">
        {sp.coverImage ? (
          <img src={sp.coverImage} alt={sp.storeName} className="h-48 w-full object-cover" />
        ) : (
          <div className="h-48 bg-gradient-to-br from-[#4140c8] to-[#8b5cf6]" />
        )}
        <div className="flex gap-4 p-5">
          {sp.logoImage ? (
            <img src={sp.logoImage} alt="" className="h-16 w-16 rounded-full border-4 border-white object-cover -mt-8" />
          ) : (
            <div className="flex h-16 w-16 -mt-8 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#4140c8] text-xl font-extrabold text-white">
              {(sp.storeName || 'S').slice(0, 1)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-ink">{sp.storeName || store?.name}</h1>
              {sp.storeVerified && <span className="rounded-full bg-[#e9ebff] px-2 py-0.5 text-xs font-bold text-[#4140c8]">Verified</span>}
              <Badge status={application.status} />
            </div>
            <p className="text-sm text-ink/45">{sp.address?.city ? `📍 ${sp.address.city}` : ''}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* The Deal */}
          <section className="panel p-5">
            <h2 className="text-xl font-extrabold">Your Deal</h2>
            <p className="mt-2 font-bold text-ink">{deal.title}</p>
            <p className="mt-2 text-sm leading-6 text-ink/60">{deal.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#e9ebff] px-3 py-1 text-xs font-bold text-[#4140c8]">{OFFER_TYPE_LABELS[deal.offerType] || deal.offerType}</span>
              {deliverableSummary.map((d) => <span key={d} className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs font-bold">{d}</span>)}
            </div>
          </section>

          {/* Visit status */}
          <section className="panel p-5">
            <h2 className="text-xl font-extrabold">Your Visit</h2>
            <div className="mt-4 flex flex-wrap gap-4">
              {application.visitSlotBooked?.date && (
                <div className="rounded-lg bg-[#f4f4f4] px-4 py-3">
                  <p className="label">Scheduled date</p>
                  <p className="font-extrabold">{new Date(application.visitSlotBooked.date).toLocaleDateString()}</p>
                  {application.visitSlotBooked.time && <p className="text-sm text-ink/50">{application.visitSlotBooked.time}</p>}
                </div>
              )}
              {sp.address?.city && (
                <div className="rounded-lg bg-[#f4f4f4] px-4 py-3">
                  <p className="label">Location</p>
                  <p className="font-extrabold">{[sp.address.street, sp.address.city].filter(Boolean).join(', ')}</p>
                  {sp.address.googleMapsLink && (
                    <a href={sp.address.googleMapsLink} target="_blank" rel="noreferrer" className="mt-1 block text-xs font-bold text-[#4140c8]">Open in Maps →</a>
                  )}
                </div>
              )}
              {application.visitConfirmed && (
                <div className="rounded-full self-center bg-[#d9f7ec] px-4 py-2 text-sm font-extrabold text-[#0f7655]">✓ Visit confirmed by store</div>
              )}
            </div>
          </section>

          {/* Submit content */}
          {['accepted', 'visited'].includes(application.status) && (
            <section className="panel p-5">
              <h2 className="text-xl font-extrabold">Submit Content</h2>
              <p className="mt-2 text-sm text-ink/60">Submit each piece of content separately.</p>
              {submitError && <div className="mt-3 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-3 py-2 text-xs font-bold text-[#a8322b]">{submitError}</div>}
              {submitSuccess && <div className="mt-3 rounded-lg border border-[#00a889]/25 bg-[#effbf8] px-3 py-2 text-xs font-bold text-[#007a65]">{submitSuccess}</div>}
              <form onSubmit={submitContent} className="mt-5 space-y-4">
                <div>
                  <label className="label">Content type</label>
                  <select className="field" value={submitType} onChange={(e) => setSubmitType(e.target.value)}>
                    {deal.deliverables?.reels > 0 && <option value="reel">Reel</option>}
                    {deal.deliverables?.stories > 0 && <option value="story">Story</option>}
                    {deal.deliverables?.staticPosts > 0 && <option value="static_post">Static Post</option>}
                    {deal.deliverables?.googleReview && <option value="google_review">Google Review</option>}
                  </select>
                </div>
                <div>
                  <label className="label">Post URL</label>
                  <input className="field" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://instagram.com/..." />
                </div>
                <div>
                  <label className="label">Screenshot (optional)</label>
                  <input className="field" type="file" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} />
                </div>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Content'}
                </button>
              </form>
            </section>
          )}

          {/* Submitted content */}
          {application.submissions?.length > 0 && (
            <section className="panel p-5">
              <h2 className="text-xl font-extrabold">Your Submissions</h2>
              <div className="mt-4 space-y-3">
                {application.submissions.map((sub, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-[#f4f4f4] px-4 py-3">
                    <div>
                      <p className="text-sm font-extrabold capitalize">{sub.type?.replace('_', ' ')}</p>
                      {sub.postUrl && <a href={sub.postUrl} className="text-xs text-[#4140c8] truncate block" target="_blank" rel="noreferrer">{sub.postUrl}</a>}
                    </div>
                    <Badge status={sub.approvalStatus} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Review prompt */}
          {application.status === 'completed' && (
            <section className="panel p-5">
              <h2 className="text-xl font-extrabold">Rate your experience</h2>
              {reviewSubmitted ? (
                <div className="mt-4">
                  <StarRating value={review.rating} readOnly />
                  <p className="mt-2 text-sm text-ink/60">{review.comment || 'Your review has been submitted.'}</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <StarRating value={review.rating} onChange={(r) => setReview((c) => ({ ...c, rating: r }))} />
                  <textarea className="field min-h-[80px]" value={review.comment} onChange={(e) => setReview((c) => ({ ...c, comment: e.target.value }))} placeholder="Share your experience working with this store..." />
                  <button type="button" className="btn-primary" onClick={submitReview} disabled={!review.rating || reviewSubmitting}>
                    {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Compensation */}
          <div className="panel p-5">
            <h2 className="text-xl font-extrabold">Compensation</h2>
            <p className="mt-2 font-bold text-ink">{OFFER_TYPE_LABELS[deal.offerType] || deal.offerType}</p>
            {deal.flatFeeAmount > 0 && <p className="text-sm text-ink/60">+ INR {deal.flatFeeAmount?.toLocaleString('en-IN')} cash</p>}
            {deal.offerDescription && <p className="mt-2 text-sm text-ink/55 leading-5">{deal.offerDescription}</p>}
          </div>

          {/* Brief */}
          {deal.brief && (
            <div className="panel p-5">
              <h2 className="text-xl font-extrabold">Creator Brief</h2>
              <p className="mt-2 text-sm leading-6 text-ink/60">{deal.brief}</p>
              {deal.requiredHashtags?.length > 0 && (
                <div className="mt-3">
                  <p className="label mb-2">Required hashtags</p>
                  <div className="flex flex-wrap gap-1">{deal.requiredHashtags.map((h) => <span key={h} className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs font-bold">{h}</span>)}</div>
                </div>
              )}
              {deal.requiredMentions?.length > 0 && (
                <div className="mt-3">
                  <p className="label mb-2">Required mentions</p>
                  <div className="flex flex-wrap gap-1">{deal.requiredMentions.map((m) => <span key={m} className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs font-bold">{m}</span>)}</div>
                </div>
              )}
            </div>
          )}

          {/* Store contact */}
          <div className="panel p-5">
            <h2 className="text-xl font-extrabold">Store Contact</h2>
            {sp.contactPhone && <p className="mt-2 text-sm text-ink/60">{sp.contactPhone}</p>}
            {sp.instagramHandle && <p className="mt-1 text-sm text-[#4140c8] font-bold">{sp.instagramHandle}</p>}
            <Link to={`/store/${store?._id}`} className="btn-secondary mt-4 w-full text-center block">View Store Profile</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreVisitWorkspacePage;
