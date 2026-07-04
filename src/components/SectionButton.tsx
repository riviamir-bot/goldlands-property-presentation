import type { LucideIcon } from "lucide-react";

interface SectionButtonProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  onClick: () => void;
}

export function SectionButton({ title, subtitle, icon: Icon, onClick }: SectionButtonProps) {
  return (
    <button className="section-button" onClick={onClick}>
      <span className="section-button__icon" aria-hidden="true">
        <Icon size={26} strokeWidth={1.6} />
      </span>
      <span>
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </span>
    </button>
  );
}
