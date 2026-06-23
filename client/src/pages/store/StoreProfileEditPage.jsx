import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const STORE_TYPES = [
  { value: 'cafe', label: 'Cafe ☕' },
  { value: 'restaurant', label: 'Restaurant 🍽️' },
  { value: 'retail_store', label: 'Retail Store 🛍️' },
  { value: 'salon_spa', label: 'Salon / Spa 💅' },
  { value: 'gym_fitness', label: 'Gym / Fitness 💪' },
  { value: 'bakery', label: 'Bakery 🥐' },
  { value: 'bar_lounge', label: 'Bar / Lounge 🍸' },
  { value: 'bookstore', label: 'Bookstore 📚' },
  { value: 'clothing_boutique', label: 'Clothing Boutique 👗' },
  { value: 'other', label: 'Other' },
];

const SectionBlock = ({ title, children }) => (
  <section className="border-t border-ink/10 pt-6 first:border-t-0 first:pt-0">
    <h2 className="text-xl font-extrabold tracking-[-0.02em] text-ink">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>
);

const StoreProfileEditPage = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    storeName: '',
    storeType: '',
    description: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    googleMapsLink: '',
    contactPhone: '',
    websiteUrl: '',
    instagramHandle: '',
    openingHours: '',
    averageSpend: '',
    gstNumber: '',
    logoImage: null,
    coverImage: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/store/profile')
      .then(({ data }) => {
        const sp = data.storeProfile || {};
        setForm((c) => ({
          ...c,
          storeName: sp.storeName || data.name || '',
          storeType: sp.storeType || '',
          description: sp.description || '',
          street: sp.address?.street || '',
          city: sp.address?.city || '',
          state: sp.address?.state || '',
          pincode: sp.address?.pincode || '',
          googleMapsLink: sp.address?.googleMapsLink || '',
          contactPhone: sp.contactPhone || '',
          websiteUrl: sp.websiteUrl || '',
          instagramHandle: sp.instagramHandle || '',
          openingHours: sp.openingHours || '',
          averageSpend: sp.averageSpend || '',
          gstNumber: sp.gstNumber || '',
        }));
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load profile'))
      .finally(() => setLoading(false));
  }, []);

  const setField = (f, v) => setForm((c) => ({ ...c, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = new FormData();
      const textFields = ['storeName', 'storeType', 'description', 'contactPhone', 'websiteUrl', 'instagramHandle', 'openingHours', 'averageSpend', 'gstNumber'];
      textFields.forEach((f) => { if (form[f]) payload.append(f, form[f]); });
      // Address fields
      const addrFields = ['street', 'city', 'state', 'pincode', 'googleMapsLink'];
      addrFields.forEach((f) => { if (form[f]) payload.append(f, form[f]); });
      if (form.logoImage instanceof File) payload.append('logoImage', form.logoImage);
      if (form.coverImage instanceof File) payload.append('coverImage', form.coverImage);

      const { data } = await api.patch('/store/profile', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ storeProfile: data.storeProfile });
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-shell"><div className="h-96 animate-pulse rounded-lg border border-ink/10 bg-white" /></div>;

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-2xl">
        <h1 className="page-title">Store Profile</h1>
        <p className="page-lead">Your store profile is what creators see when they browse or visit your deal.</p>

        <form onSubmit={handleSubmit} className="panel mt-8 space-y-6 p-5 sm:p-7">
          {error ? <div className="rounded-lg border border-[#ff7a1a]/25 bg-[#fff5ec] px-4 py-3 text-sm font-bold text-[#b64c00]">{error}</div> : null}
          {success ? <div className="rounded-lg border border-[#00a889]/25 bg-[#effbf8] px-4 py-3 text-sm font-bold text-[#007a65]">{success}</div> : null}

          <SectionBlock title="Store basics">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Store name</label>
                <input className="field" value={form.storeName} onChange={(e) => setField('storeName', e.target.value)} required />
              </div>
              <div>
                <label className="label">Store type</label>
                <select className="field" value={form.storeType} onChange={(e) => setField('storeType', e.target.value)} required>
                  <option value="">Select type</option>
                  {STORE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Description ({form.description.length}/500)</label>
                <textarea className="field min-h-[120px]" maxLength={500} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Tell creators what makes your place special..." required />
              </div>
              <div>
                <label className="label">Opening hours</label>
                <input className="field" value={form.openingHours} onChange={(e) => setField('openingHours', e.target.value)} placeholder="Mon–Fri 9am–10pm" />
              </div>
              <div>
                <label className="label">Average spend per person</label>
                <input className="field" value={form.averageSpend} onChange={(e) => setField('averageSpend', e.target.value)} placeholder="₹300–₹600" />
              </div>
            </div>
          </SectionBlock>

          <SectionBlock title="Visuals">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Logo / Profile image</label>
                <input className="field file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-white" type="file" accept="image/*" onChange={(e) => setField('logoImage', e.target.files?.[0] || null)} />
              </div>
              <div>
                <label className="label">Cover / Banner image</label>
                <input className="field file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-white" type="file" accept="image/*" onChange={(e) => setField('coverImage', e.target.files?.[0] || null)} />
              </div>
            </div>
          </SectionBlock>

          <SectionBlock title="Location">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="label">Street address</label>
                <input className="field" value={form.street} onChange={(e) => setField('street', e.target.value)} placeholder="123 MG Road" />
              </div>
              <div>
                <label className="label">City</label>
                <input className="field" value={form.city} onChange={(e) => setField('city', e.target.value)} required placeholder="Mumbai" />
              </div>
              <div>
                <label className="label">State</label>
                <input className="field" value={form.state} onChange={(e) => setField('state', e.target.value)} placeholder="Maharashtra" />
              </div>
              <div>
                <label className="label">Pincode</label>
                <input className="field" value={form.pincode} onChange={(e) => setField('pincode', e.target.value)} placeholder="400001" />
              </div>
              <div>
                <label className="label">Google Maps link</label>
                <input className="field" value={form.googleMapsLink} onChange={(e) => setField('googleMapsLink', e.target.value)} placeholder="https://maps.google.com/..." />
              </div>
            </div>
          </SectionBlock>

          <SectionBlock title="Contact &amp; socials">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Phone</label>
                <input className="field" value={form.contactPhone} onChange={(e) => setField('contactPhone', e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="label">Website</label>
                <input className="field" value={form.websiteUrl} onChange={(e) => setField('websiteUrl', e.target.value)} placeholder="https://yourstore.com" />
              </div>
              <div>
                <label className="label">Instagram handle</label>
                <input className="field" value={form.instagramHandle} onChange={(e) => setField('instagramHandle', e.target.value)} placeholder="@yourstore" />
              </div>
              <div>
                <label className="label">GST number (for verification)</label>
                <input className="field" value={form.gstNumber} onChange={(e) => setField('gstNumber', e.target.value)} placeholder="22AAAAA0000A1Z5" />
              </div>
            </div>
          </SectionBlock>

          <div className="border-t border-ink/10 pt-5">
            <button disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoreProfileEditPage;
