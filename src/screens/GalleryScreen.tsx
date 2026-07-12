import { useState } from "react";
import type { GalleryCategory, Project } from "../types";

interface GalleryScreenProps {
  project: Project;
}

const tabs: Array<{ id: GalleryCategory; label: string }> = [
  { id: "exterior", label: "חוץ" },
  { id: "interior", label: "פנים" },
  { id: "lobby", label: "לובי" },
  { id: "surroundings", label: "סביבה" },
];

export function GalleryScreen({ project }: GalleryScreenProps) {
  const [active, setActive] = useState<GalleryCategory>("exterior");
  const activeImage = project.gallery[active][0];

  return (
    <section className="gallery-screen">
      <div className="tab-row" role="tablist" aria-label="קטגוריות הדמיה">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            className={active === tab.id ? "active" : ""}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeImage ? (
        <div className="gallery-frame">
          <img src={activeImage} alt={`${project.name} - ${tabs.find((tab) => tab.id === active)?.label}`} />
          <div className="gallery-caption">
            <span className="eyebrow">{project.name}</span>
            <h2>{tabs.find((tab) => tab.id === active)?.label}</h2>
          </div>
        </div>
      ) : (
        <div className="empty-state gallery-empty-state">
          <h2>אין עדיין תמונות בקטגוריה הזו</h2>
          <p>התמונות שיועלו בניהול הפרויקט יופיעו כאן.</p>
        </div>
      )}
    </section>
  );
}
