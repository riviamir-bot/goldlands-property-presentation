import { useI18n } from "../i18n/LanguageContext";
import type { ApartmentStatus } from "../types";

export function StatusBadge({ status }: { status: ApartmentStatus }) {
  const { t } = useI18n();
  return <span className={`status-badge status-badge--${status}`}>{t(`status.${status}`)}</span>;
}
