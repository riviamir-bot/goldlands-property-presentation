import { useEffect, useMemo, useState } from "react";
import { Bike, Building, Car, Copy, ExternalLink, GraduationCap, MapPin, Navigation, Trees } from "lucide-react";
import type { Project } from "../types";

const places = [
  { label: "פארק מרכזי", value: "3 דקות", icon: Trees },
  { label: "רכבת קלה", value: "7 דקות", icon: Car },
  { label: "בתי ספר", value: "5 דקות", icon: GraduationCap },
  { label: "מרכז מסחרי", value: "4 דקות", icon: Building },
  { label: "שבילי אופניים", value: "צמוד", icon: Bike },
];

function makeMapsEmbedUrl(address: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(address).replace(/%20/g, "+")}&output=embed`;
}

export function LocationScreen({ project }: { project: Project }) {
  const [mapFailed, setMapFailed] = useState(false);
  const embedUrl = useMemo(
    () => project.googleMapsEmbedUrl || makeMapsEmbedUrl(project.address),
    [project.address, project.googleMapsEmbedUrl],
  );

  useEffect(() => {
    setMapFailed(false);
  }, [embedUrl]);

  const copyAddress = () => {
    void navigator.clipboard?.writeText(project.address);
  };

  return (
    <section className="location-layout">
      <section className="map-panel location-map-panel" aria-label={`מפת ${project.name}`}>
        {!mapFailed ? (
          <iframe
            allowFullScreen
            loading="lazy"
            onError={() => setMapFailed(true)}
            referrerPolicy="no-referrer-when-downgrade"
            src={embedUrl}
            title={`מפת ${project.name}`}
          />
        ) : (
          <div className="map-fallback">
            <MapPin size={42} strokeWidth={1.6} />
            <span>לא ניתן לטעון את תצוגת המפה כרגע</span>
            <strong>{project.address}</strong>
            <a className="gold-button gold-button--compact" href={project.googleMapsUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              פתיחה במפות Google
            </a>
          </div>
        )}
      </section>

      <aside className="location-side-panel">
        <div className="location-address-panel">
          <div className="location-address-panel__icon">
            <MapPin size={34} />
          </div>
          <div>
            <span className="eyebrow">כתובת הפרויקט</span>
            <h2>{project.address}</h2>
            <p>
              {project.name} ממוקם ב{project.neighborhood}, {project.city}. ניתן לפתוח ניווט או לשתף את הכתובת
              ישירות מתוך פגישת המכירה.
            </p>
          </div>
          <div className="location-address-panel__actions">
            <a className="gold-button" href={project.googleMapsUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={17} />
              פתיחה במפות Google
            </a>
            <button className="ghost-button" onClick={copyAddress} type="button">
              <Copy size={17} />
              העתקת כתובת
            </button>
          </div>
        </div>

        <div className="nearby-grid">
          <article className="nearby-card nearby-card--address">
            <Navigation size={24} strokeWidth={1.7} />
            <span>אזור</span>
            <strong>{project.location}</strong>
          </article>
          {places.map((place) => {
            const Icon = place.icon;

            return (
              <article className="nearby-card" key={place.label}>
                <Icon size={24} strokeWidth={1.7} />
                <span>{place.label}</span>
                <strong>{place.value}</strong>
              </article>
            );
          })}
        </div>
      </aside>
    </section>
  );
}
