import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const INTEREST_OPTIONS = ['Lifestyle', 'Sports', 'Fashion', 'Travel', 'Tech', 'Food & Beverage', 'Gaming', 'Health & Fitness', 'Beauty', 'Finance', 'Education', 'Entertainment', 'Parenting', 'Automotive', 'Pets', 'Cafe Hopping', 'Food Review', 'Local Exploration', 'Lifestyle (Local)'];
const PLATFORM_OPTIONS = ['Instagram', 'YouTube', 'TikTok', 'Twitter', 'LinkedIn', 'Other'];
const CAMPAIGN_TYPE_OPTIONS = ['Story mention', 'Dedicated post', 'Long-term ambassador', 'Event coverage', 'Product review', 'Reel/Short video', 'Blog/Article'];
const BRAND_CATEGORY_OPTIONS = ['Sports', 'Tourism', 'Fashion', 'Technology', 'Food & Beverage', 'Health & Wellness', 'Automotive', 'Finance', 'Education', 'Entertainment', 'FMCG', 'Real Estate', 'Other'];
const AVAILABILITY_OPTIONS = ['Paid only', 'Gifting only', 'Both'];
const BUDGET_OPTIONS = ['Micro (< ₹10k)', 'Mid (₹10k–₹50k)', 'Premium (₹50k+)'];

const emptyForm = {
  displayName: '', bio: '', location: '', website: '', avatar: null,
  handle: '', platform: '', followerCount: '', engagementRate: '', interests: [], availability: '', pastBrands: '',
  brandCategory: '', targetAudience: '', campaignInterests: [], budgetTier: '', campaignTypes: [], activeCampaigns: '', role: 'influencer',
};

const READONLY_PROFILE_FIELDS = new Set(['user', '_id', 'createdAt', 'updatedAt', '__v']);

const SectionBlock = ({ title, children }) => (
  <section className="border-t border-ink/10 pt-6 first:border-t-0 first:pt-0">
    <h2 className="text-xl font-extrabold tracking-[-0.02em] text-ink">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>
);

const EditProfilePage = () => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/profile/me');
        const profileFields = Object.fromEntries(
          Object.entries(data).filter(([key]) => !READONLY_PROFILE_FIELDS.has(key))
        );
        setForm({
          ...emptyForm,
          ...profileFields,
          pastBrands: data.pastBrands?.join(', ') || '',
          activeCampaigns: data.activeCampaigns?.join(', ') || '',
          followerCount: data.followerCount ?? '',
          engagementRate: data.engagementRate ?? '',
          role: data.role,
          avatar: null,
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const isInfluencer = form.role === 'influencer' || form.role === 'creator';
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const toggleSelection = (field, value) => setForm((current) => ({
    ...current,
    [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value],
  }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'role' || READONLY_PROFILE_FIELDS.has(key)) return;
        if (['followerCount', 'engagementRate'].includes(key)) return;
        if (value === null || value === '') return;
        if (Array.isArray(value)) {
          payload.append(key, JSON.stringify(value));
          return;
        }
        if (key === 'avatar' && value instanceof File) {
          payload.append('avatar', value);
          return;
        }
        payload.append(key, value);
      });

      payload.set('pastBrands', JSON.stringify(form.pastBrands.split(',').map((item) => item.trim()).filter(Boolean)));
      payload.set('activeCampaigns', JSON.stringify(form.activeCampaigns.split(',').map((item) => item.trim()).filter(Boolean)));

      await api.put('/profile/me', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const pillClass = (selected) => `rounded-full border px-3.5 py-2 text-sm font-medium transition ${
    selected
      ? 'border-ink bg-ink text-white'
      : 'border-ink/8 bg-white/75 text-ink/60 hover:border-ink/15 hover:text-ink'
  }`;

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-2xl">
          <div className="h-[32rem] animate-pulse rounded-lg border border-ink/10 bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-2xl">
        <h1 className="page-title">Edit profile</h1>
        <p className="page-lead">Update the details that shape first impressions and match quality.</p>

        <form onSubmit={handleSubmit} className="panel mt-8 space-y-6 p-5 sm:p-7">
          {error ? (
            <div className="rounded-lg border border-[#ff7a1a]/25 bg-[#fff5ec] px-4 py-3 text-sm font-bold text-[#b64c00]">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-lg border border-[#00a889]/25 bg-[#effbf8] px-4 py-3 text-sm font-bold text-[#007a65]">
              {success}
            </div>
          ) : null}

          <SectionBlock title="Core identity">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Display name</label>
                <input className="field" value={form.displayName} onChange={(e) => setField('displayName', e.target.value)} required />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="field" value={form.location} onChange={(e) => setField('location', e.target.value)} required />
              </div>
              <div className="md:col-span-2">
                <label className="label">Bio</label>
                <textarea className="field min-h-[120px]" value={form.bio} onChange={(e) => setField('bio', e.target.value)} required maxLength={400} />
              </div>
              <div>
                <label className="label">Website</label>
                <input className="field" value={form.website} onChange={(e) => setField('website', e.target.value)} />
              </div>
              <div>
                <label className="label">Avatar</label>
                <input
                  className="field file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-white"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setField('avatar', e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </SectionBlock>

          {isInfluencer ? (
            <>
              <SectionBlock title="Creator details">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">Handle</label>
                    <input className="field" value={form.handle} onChange={(e) => setField('handle', e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Platform</label>
                    <select className="field" value={form.platform} onChange={(e) => setField('platform', e.target.value)} required>
                      <option value="">Select platform</option>
                      {PLATFORM_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 rounded-lg border border-ink/10 bg-ink/[0.035] px-4 py-3 text-sm font-bold text-ink/55">
                    Follower count and engagement rate are updated from Instagram analytics on your dashboard.
                  </div>
                </div>
              </SectionBlock>

              <SectionBlock title="Collaboration preferences">
                <div className="space-y-5">
                  <div>
                    <label className="label">Interests</label>
                    <div className="flex flex-wrap gap-2">
                      {INTEREST_OPTIONS.map((option) => (
                        <button type="button" key={option} className={pillClass(form.interests.includes(option))} onClick={() => toggleSelection('interests', option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Availability</label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABILITY_OPTIONS.map((option) => (
                        <button type="button" key={option} className={pillClass(form.availability === option)} onClick={() => setField('availability', option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Past brands</label>
                    <input className="field" value={form.pastBrands} onChange={(e) => setField('pastBrands', e.target.value)} placeholder="Comma-separated list" />
                  </div>
                </div>
              </SectionBlock>
            </>
          ) : (
            <>
              <SectionBlock title="Brand positioning">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">Brand category</label>
                    <select className="field" value={form.brandCategory} onChange={(e) => setField('brandCategory', e.target.value)} required>
                      <option value="">Select category</option>
                      {BRAND_CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Target audience</label>
                    <input className="field" value={form.targetAudience} onChange={(e) => setField('targetAudience', e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Budget tier</label>
                    <select className="field" value={form.budgetTier} onChange={(e) => setField('budgetTier', e.target.value)} required>
                      <option value="">Select budget tier</option>
                      {BUDGET_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Active campaigns</label>
                    <input className="field" value={form.activeCampaigns} onChange={(e) => setField('activeCampaigns', e.target.value)} required />
                  </div>
                </div>
              </SectionBlock>

              <SectionBlock title="Campaign preferences">
                <div className="space-y-5">
                  <div>
                    <label className="label">Campaign interests</label>
                    <div className="flex flex-wrap gap-2">
                      {INTEREST_OPTIONS.map((option) => (
                        <button type="button" key={option} className={pillClass(form.campaignInterests.includes(option))} onClick={() => toggleSelection('campaignInterests', option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Campaign types</label>
                    <div className="flex flex-wrap gap-2">
                      {CAMPAIGN_TYPE_OPTIONS.map((option) => (
                        <button type="button" key={option} className={pillClass(form.campaignTypes.includes(option))} onClick={() => toggleSelection('campaignTypes', option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionBlock>
            </>
          )}

          <div className="border-t border-ink/10 pt-5">
            <button disabled={saving} className="btn-primary">
              {saving ? 'Saving changes…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfilePage;
