export const lineupCopy = {
  campaign: 'Show',
  deal: 'Opening slot',
  apply: 'Get booked',
  application: 'Booking request',
  deliverable: 'Set list item',
  'status:pending': 'Pending review',
  'status:approved': 'On the bill',
  'status:rejected': 'Cut from the lineup',
  'payment:paid': 'Paid out',
  'payment:partial': 'Partial pay',
  verified: 'Confirmed booking',
  brandDashboard: 'The Stage',
  discover: 'The Bill',
  createDeal: 'Book an Opening Slot',
  campaignsNav: 'Shows',
};

export const lineupStatusLabel = (status) => {
  if (!status) return status;
  const key = `status:${String(status).toLowerCase()}`;
  return lineupCopy[key] ?? status;
};

export const lineupPaymentLabel = (status) => {
  if (!status) return status;
  const key = `payment:${String(status).toLowerCase()}`;
  return lineupCopy[key] ?? status;
};
