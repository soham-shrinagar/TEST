import React from 'react';

const colors = [
  'border-ink/10 bg-white text-ink/62',
  'border-[#5f5dff]/20 bg-[#f4f4ff] text-[#4140c8]',
  'border-[#00a889]/20 bg-[#effbf8] text-[#007a65]',
  'border-[#ff7a1a]/20 bg-[#fff5ec] text-[#b64c00]',
];

const CategoryTag = ({ label, index = 0 }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${colors[index % colors.length]}`}>
    {label}
  </span>
);

export default CategoryTag;
