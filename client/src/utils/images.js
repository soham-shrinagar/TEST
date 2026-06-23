const BASE_URL = 'http://localhost:5001';

const INSTAGRAM_HOSTS = ['instagram.com', 'cdninstagram.com', 'fbcdn.net'];

export const proxiedInstagramImage = (url) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const isInstagramAsset = INSTAGRAM_HOSTS.some((host) => (
      parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    ));
    return isInstagramAsset ? `/api/instagram/image?url=${encodeURIComponent(url)}` : url;
  } catch {
    return '';
  }
};

export const avatarUrl = (profile = {}, fallbackName = 'CS') => {
  const source = profile.avatar || profile.instagram_profile_pic || profile.profile_pic || profile.user?.instagram_profile_pic || profile.user?.profile_pic || '';
  if (source?.startsWith?.('http')) return proxiedInstagramImage(source);
  if (source?.startsWith?.('/uploads/')) return `${BASE_URL}${source}`;
  if (source) return `${BASE_URL}/uploads/${source}`;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || profile.name || fallbackName)}&background=4b7f75&color=fff&size=240`;
};

export { BASE_URL };
