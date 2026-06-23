import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { niches } from '../../components/campaignUtils';

const OFFER_TYPES = [
  { value: 'free_meal', label: '🍽️ Free Meal / Experience', desc: 'Creator visits and dines/experiences at no cost.' },
  { value: 'flat_fee', label: '💰 Flat Fee + Experience', desc: 'Pay a flat fee plus the visit experience.' },
  { value: 'discount_voucher', label: '🎟️ Discount Voucher', desc: 'Creator gets a % off their visit.' },
  { value: 'combo', label: '🤝 Combo (Meal + Fee)', desc: 'Combine free meal with a cash component.' },
];

const defaultForm = {
  title: '',
  description: '',
  offerType: 'free_meal',
  flatFeeAmount: 0,
  offerDescription: '',
  deliverables: {
    reels: 0,
    stories: 0,
    staticPosts: 0,
    googleReview: false,
    instagramTagRequired: true,
  },
  requirements: {
    minFollowers: 1000,
    maxFollowers: 0,
    minEngagementRate: 0,
    preferredNiches: [],
    location: '',
    maxCreators: 3,
  },
  brief: '',
  dos: '',
  donts: '',
  requiredHashtags: '',
  requiredMentions: '',
  bookingDeadline: '',
};

const StoreCreateDealPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = (key, value) => setForm((c) => ({ ...c, [key]: value }));
  const setDeliverable = (key, value) => setForm((c) => ({ ...c, deliverables: { ...c.deliverables, [key]: value } }));
  const setRequirement = (key, value) => setForm((c) => ({ ...c, requirements: { ...c.requirements, [key]: value } }));
  const toggleNiche = (niche) => setRequirement('preferredNiches', form.requirements.preferredNiches.includes(niche)
    ? form.requirements.preferredNiches.filter((n) => n !== niche)
    : [...form.requirements.preferredNiches, niche]);

  const buildPayload = (status) => ({
    ...form,
    status,
    dos: form.dos ? form.dos.split('\n').filter(Boolean) : [],
    donts: form.donts ? form.donts.split('\n').filter(Boolean) : [],
    requiredHashtags: form.requiredHashtags ? form.requiredHashtags.split(/[\s,]+/).filter(Boolean) : [],
    requiredMentions: form.requiredMentions ? form.requiredMentions.split(/[\s,]+/).filter(Boolean) : [],
  });

  const save = async (status) => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/store/deals', buildPayload(status));
      navigate(`/store/deals/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save deal');
    } finally {
      setSaving(false);
    }
  };

  const pillClass = (active) => `rounded-full border px-3.5 py-2 text-sm font-medium transition cursor-pointer ${
    active ? 'border-ink bg-ink text-white' : 'border-ink/8 bg-white/75 text-ink/60 hover:border-ink/15 hover:text-ink'
  }`;

  return (
    <div className="page-shell">
      <div className="border-b border-ink/10 pb-6">
        <div className="eyebrow">New Deal</div>
        <h1 className="mt-4 page-title">Post a Store Deal</h1>
        <p className="page-lead">Invite local creators to visit, experience, and share your story.</p>
      </div>

      {error ? <div className="mt-5 rounded-lg border border-[#d64f4f]/25 bg-[#fff0ef] px-4 py-3 text-sm font-bold text-[#a8322b]">{error}</div> : null}

      <div className="mt-6 space-y-6">

        {/* Section 1: Basics */}
        <section className="panel p-5 sm:p-6">
          <h2 className="text-xl font-extrabold text-ink">Deal basics</h2>
          <div className="mt-5 grid gap-5">
            <div>
              <label className="label">Deal title</label>
              <input className="field" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Complimentary brunch for food creators" required />
            </div>
            <div>
              <label className="label">Description ({form.description.length}/400)</label>
              <textarea className="field min-h-[120px]" maxLength={400} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Describe what the creator will experience at your store..." required />
            </div>
          </div>
        </section>

        {/* Section 2: Offer */}
        <section className="panel p-5 sm:p-6">
          <h2 className="text-xl font-extrabold text-ink">What you&apos;re offering</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {OFFER_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setField('offerType', t.value)}
                className={`rounded-lg border px-4 py-3 text-left transition ${form.offerType === t.value ? 'border-ink bg-ink text-white' : 'border-ink/10 bg-white hover:border-ink/20'}`}
              >
                <p className="font-extrabold">{t.label}</p>
                <p className={`mt-1 text-xs leading-5 ${form.offerType === t.value ? 'text-white/70' : 'text-ink/55'}`}>{t.desc}</p>
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(form.offerType === 'flat_fee' || form.offerType === 'combo') && (
              <div>
                <label className="label">Cash component (INR)</label>
                <input className="field" type="number" min="0" value={form.flatFeeAmount} onChange={(e) => setField('flatFeeAmount', Number(e.target.value))} />
              </div>
            )}
            <div className={form.offerType === 'flat_fee' || form.offerType === 'combo' ? '' : 'sm:col-span-2'}>
              <label className="label">Offer details</label>
              <input className="field" value={form.offerDescription} onChange={(e) => setField('offerDescription', e.target.value)} placeholder="Full brunch for 2, including drinks" />
            </div>
          </div>
        </section>

        {/* Section 3: Deliverables */}
        <section className="panel p-5 sm:p-6">
          <h2 className="text-xl font-extrabold text-ink">What you want from creators</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[['reels', 'Reels'], ['stories', 'Stories'], ['staticPosts', 'Static Posts']].map(([key, label]) => (
              <div key={key} className="rounded-lg border border-ink/10 p-4">
                <label className="flex items-center gap-3 text-sm font-extrabold">
                  <input type="checkbox" checked={form.deliverables[key] > 0} onChange={(e) => setDeliverable(key, e.target.checked ? 1 : 0)} />
                  {label}
                </label>
                {form.deliverables[key] > 0 && (
                  <input className="field mt-3" type="number" min="1" max="10" value={form.deliverables[key]} onChange={(e) => setDeliverable(key, Number(e.target.value))} />
                )}
              </div>
            ))}
            <div className="rounded-lg border border-ink/10 p-4">
              <label className="flex items-center gap-3 text-sm font-extrabold">
                <input type="checkbox" checked={form.deliverables.googleReview} onChange={(e) => setDeliverable('googleReview', e.target.checked)} />
                Google Review
              </label>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <input type="checkbox" id="igTag" checked={form.deliverables.instagramTagRequired} onChange={(e) => setDeliverable('instagramTagRequired', e.target.checked)} />
            <label htmlFor="igTag" className="text-sm font-bold">Require Instagram tag</label>
          </div>
        </section>

        {/* Section 4: Creator requirements */}
        <section className="panel p-5 sm:p-6">
          <h2 className="text-xl font-extrabold text-ink">Creator requirements</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">City / Location</label>
              <input className="field" value={form.requirements.location} onChange={(e) => setRequirement('location', e.target.value)} placeholder="Mumbai" />
            </div>
            <div>
              <label className="label">Min followers</label>
              <input className="field" type="number" min="0" value={form.requirements.minFollowers} onChange={(e) => setRequirement('minFollowers', Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Max creators for this deal</label>
              <input className="field" type="number" min="1" max="50" value={form.requirements.maxCreators} onChange={(e) => setRequirement('maxCreators', Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Max followers (0 = no limit)</label>
              <input className="field" type="number" min="0" value={form.requirements.maxFollowers} onChange={(e) => setRequirement('maxFollowers', Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Booking deadline</label>
              <input className="field" type="date" value={form.bookingDeadline} onChange={(e) => setField('bookingDeadline', e.target.value)} />
            </div>
          </div>
          <div className="mt-5">
            <label className="label">Preferred creator niches</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {niches.map((niche) => (
                <button
                  key={niche}
                  type="button"
                  onClick={() => toggleNiche(niche)}
                  className={pillClass(form.requirements.preferredNiches.includes(niche))}
                >
                  {niche}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Brief */}
        <section className="panel p-5 sm:p-6">
          <h2 className="text-xl font-extrabold text-ink">Brief &amp; guidelines</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Creator brief</label>
              <textarea className="field min-h-[100px]" value={form.brief} onChange={(e) => setField('brief', e.target.value)} placeholder="Tell creators what to focus on — the ambience, the signature dish, the vibe..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Do's (one per line)</label>
                <textarea className="field min-h-[80px]" value={form.dos} onChange={(e) => setField('dos', e.target.value)} placeholder="Show the signature dish&#10;Tag our Instagram" />
              </div>
              <div>
                <label className="label">Don'ts (one per line)</label>
                <textarea className="field min-h-[80px]" value={form.donts} onChange={(e) => setField('donts', e.target.value)} placeholder="Don't mention competitor brands&#10;Avoid exterior-only shots" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Required hashtags (space or comma separated)</label>
                <input className="field" value={form.requiredHashtags} onChange={(e) => setField('requiredHashtags', e.target.value)} placeholder="#thebrewlab #mumbaicafe" />
              </div>
              <div>
                <label className="label">Required mentions (space or comma separated)</label>
                <input className="field" value={form.requiredMentions} onChange={(e) => setField('requiredMentions', e.target.value)} placeholder="@thebrewlab" />
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-3 pb-6">
          <button type="button" className="btn-secondary" disabled={saving} onClick={() => save('draft')}>Save as Draft</button>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => save('active')}>
            {saving ? 'Posting…' : 'Post Deal'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreCreateDealPage;
