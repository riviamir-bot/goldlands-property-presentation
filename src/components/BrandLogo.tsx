import { useState } from "react";
import { Building2 } from "lucide-react";

/** Official GOLDLANDS logo with a transparent background. Until the file is added, the text mark is shown. */
export const BRAND_LOGO_SRC = "/brand/goldlands-logo.png";

interface BrandLogoProps {
  compact?: boolean;
  onClick?: () => void;
}

export function BrandLogo({ compact = false, onClick }: BrandLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const content = !imageFailed ? (
    <img
      className={`brand-logo__image${compact ? " brand-logo__image--compact" : ""}`}
      src={BRAND_LOGO_SRC}
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
