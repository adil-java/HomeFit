const rsFormatter = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** "Rs. 12,500" */
export const formatRs = (value) => `Rs. ${rsFormatter.format(Number(value || 0))}`;

export const formatNumber = (value) => new Intl.NumberFormat('en-PK').format(Number(value || 0));

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

export const timeAgo = (value) => {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatDate(value);
};

/** First image URL of a product (images is a JSON array of URLs or {url}). */
export const firstImage = (images) => {
  let list = images;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return list;
    }
  }
  if (!Array.isArray(list) || list.length === 0) return '';
  const first = list[0];
  return typeof first === 'string' ? first : first?.url || first?.secure_url || '';
};

export const imageList = (images) => {
  let list = images;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return [list];
    }
  }
  if (!Array.isArray(list)) return [];
  return list.map((i) => (typeof i === 'string' ? i : i?.url || i?.secure_url)).filter(Boolean);
};

export const shortId = (id) => (id ? String(id).slice(0, 8) : '');
