// Central status → Arabic label + badge-class maps for the platform-owner UI.
// One source of truth so no page renders raw English statuses.

export const HOTEL_STATUS_LABEL: Record<string, string> = {
  active: "فعال", suspended: "موقوف", archived: "مؤرشف",
};
export const SUB_STATUS_LABEL: Record<string, string> = {
  trial: "تجريبي", active: "فعال", expired: "منتهي", suspended: "موقوف", not_set: "غير مضبوط",
};
export const PAY_STATUS_LABEL: Record<string, string> = {
  paid: "مدفوع", unpaid: "غير مدفوع", partial: "مدفوع جزئيًا",
};
export const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار", confirmed: "مؤكد", checked_in: "تم تسجيل الدخول",
  checked_out: "مكتمل", cancelled: "ملغى", no_show: "لم يحضر",
};
export const COMMISSION_STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار", due: "مستحقة", paid: "مدفوعة",
  partial: "مدفوعة جزئيًا", waived: "معفاة", cancelled: "ملغاة",
};

export const HOTEL_STATUS_BADGE: Record<string, string> = {
  active: "ds-badge ds-badge-success", suspended: "ds-badge ds-badge-danger", archived: "ds-badge ds-badge-neutral",
};
export const SUB_STATUS_BADGE: Record<string, string> = {
  trial: "ds-badge ds-badge-info", active: "ds-badge ds-badge-success", expired: "ds-badge ds-badge-danger",
  suspended: "ds-badge ds-badge-warning", not_set: "ds-badge ds-badge-neutral",
};
export const PAY_STATUS_BADGE: Record<string, string> = {
  paid: "ds-badge ds-badge-success", unpaid: "ds-badge ds-badge-danger", partial: "ds-badge ds-badge-warning",
};
export const BOOKING_STATUS_BADGE: Record<string, string> = {
  pending: "ds-badge ds-badge-neutral", confirmed: "ds-badge ds-badge-info", checked_in: "ds-badge ds-badge-success",
  checked_out: "ds-badge ds-badge-neutral", cancelled: "ds-badge ds-badge-danger", no_show: "ds-badge ds-badge-warning",
};
export const COMMISSION_STATUS_BADGE: Record<string, string> = {
  pending: "ds-badge ds-badge-neutral", due: "ds-badge ds-badge-warning", paid: "ds-badge ds-badge-success",
  partial: "ds-badge ds-badge-info", waived: "ds-badge ds-badge-neutral", cancelled: "ds-badge ds-badge-danger",
};

const NEUTRAL = "ds-badge ds-badge-neutral";
const pick = (labels: Record<string, string>, badges: Record<string, string>) =>
  (s?: string | null) => ({ label: labels[s ?? ""] ?? (s || "—"), badge: badges[s ?? ""] ?? NEUTRAL });

export const hotelStatus      = pick(HOTEL_STATUS_LABEL,      HOTEL_STATUS_BADGE);
export const subStatus        = pick(SUB_STATUS_LABEL,        SUB_STATUS_BADGE);
export const payStatus        = pick(PAY_STATUS_LABEL,        PAY_STATUS_BADGE);
export const bookingStatus    = pick(BOOKING_STATUS_LABEL,    BOOKING_STATUS_BADGE);
export const commissionStatus = pick(COMMISSION_STATUS_LABEL, COMMISSION_STATUS_BADGE);
