import type { ApartmentStatus } from "../types";

const labels: Record<ApartmentStatus, string> = {
  available: "פנויה",
  option: "באופציה",
  reserved: "שמורה",
  sold: "נמכרה",
  notMarketing: "לא לשיווק",
};

export function StatusBadge({ status }: { status: ApartmentStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{labels[status]}</span>;
}
