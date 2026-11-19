// Kiểu & hằng số dùng chung giữa web và api
export const ORDER_STATUSES = [
  'PENDING_PAYMENT', 'PLACED', 'ACCEPTED', 'PREPARING', 'AWAITING_APPROVAL', 'REVISION_REQUESTED',
  'APPROVED', 'DELIVERING', 'DELIVERED', 'COMPLETED', 'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PREVIEW_RULES = { expireMinutes: 90, maxRevisions: 2, maxImages: 3 } as const;
export const REVIEW_RULES = { maxImages: 5, editHours: 48, lowRating: 2 } as const;
export const CARD_MESSAGE_MAX = 150;
export type Role = 'CUSTOMER' | 'ADMIN';
