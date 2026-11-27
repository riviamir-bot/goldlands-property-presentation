import { useState } from "react";
import { Building2 } from "lucide-react";

/** Official GOLDLANDS logo (from the brand file in Canva), transparent background. */
const LOGO_SRC = {
  /** White wordmark, for the dark marketer app. */
  dark: "/brand/goldlands-logo-light-horizontal.png",
  /** Navy wordmark, for light pages such as Gold View. */
  light: "/brand/goldlands-logo-horizontal.png",
} as const;

interface BrandLogoProps {
  compact?: boolean;
  /** Background the logo sits on. */
  surface?: "dark" | "light";
  onClick?: () => void;
}

export function BrandLogo({ compact = false, surface = "dark", onClick }: BrandLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const content = !imageFailed ? (
    <img
      className={`brand-logo__image${compact ? " brand-logo__image--compact" : ""}`}
      src={LOGO_SRC[surface]}
      alt="GOLDLANDS"
      onError={() => setImageFailed(true)}
    />
  ) : (
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
