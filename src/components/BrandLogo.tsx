import { Building2 } from "lucide-react";

interface BrandLogoProps {
  compact?: boolean;
  onClick?: () => void;
}

export function BrandLogo({ compact = false, onClick }: BrandLogoProps) {
  const content = (
    <>
      <span className="brand-logo__mark" aria-hidden="true">
        <Building2 size={compact ? 22 : 34} strokeWidth={1.35} />
      </span>
      <span className="brand-logo__text">
        <strong>GOLDLANDS</strong>
        <small>MARKETING REAL ESTATE</small>
      </span>
    </>
  );

  if (onClick) {
    return (
      <button className="brand-logo brand-logo--button" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className="brand-logo">{content}</div>;
}
