import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bus, Copy, GraduationCap, HeartPulse, Navigation, ShoppingCart, Star, Trees } from "lucide-react";
import { useI18n } from "../i18n/LanguageContext";
import {
  fetchNearbyPlaces,
  geocodeAddress,
  PLACE_CATEGORIES,
  type LatLon,
  type NearbyPlace,
  type PlaceCategory,
} from "../services/geo";
import type { Project } from "../types";
import { escapeHtml } from "../utils/html";

const CATEGORY_STYLE: Record<PlaceCategory, { color: string; icon: typeof Star }> = {
  education: { color: "#8ca8d8", icon: GraduationCap },
  synagogues: { color: "#e7bb66", icon: Star },
  parks: { color: "#7fc9a2", icon: Trees },
  transit: { color: "#c79be0", icon: Bus },
  shopping: { color: "#e59a7a", icon: ShoppingCart },
  health: { color: "#d57777", icon: HeartPulse },
};

type LoadState<T> = { status: "loading" } | { status: "failed" } | { status: "ready"; value: T };

function markerIcon(color: string, className = "") {
  return L.divIcon({
    className: `map-marker ${className}`,
    html: `<span style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const projectIcon = L.divIcon({
  className: "map-marker map-marker--project",
  html: "<span></span>",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export function LocationScreen({ project }: { project: Project }) {
  const { t } = useI18n();
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const [point, setPoint] = useState<LoadState<LatLon>>({ status: "loading" });
  const [places, setPlaces] = useState<LoadState<NearbyPlace[]>>({ status: "loading" });
  const [enabled, setEnabled] = useState<Set<PlaceCategory>>(() => new Set(PLACE_CATEGORIES));
  const [copied, setCopied] = useState(false);
  // The map search only knows Hebrew street names, so it always uses the Hebrew address.
  const geoAddress = project.geoQuery?.address ?? (project.address || project.city);
  const geoCity = project.geoQuery?.city ?? project.city;

  useEffect(() => {
    const controller = new AbortController();
    setPoint({ status: "loading" });
    setPlaces({ status: "loading" });
    geocodeAddress(geoAddress, geoCity, controller.signal)
      .then((value) => setPoint(value ? { status: "ready", value } : { status: "failed" }))
      .catch(() => {
        if (!controller.signal.aborted) setPoint({ status: "failed" });
      });
    return () => controller.abort();
  }, [geoAddress, geoCity]);

  useEffect(() => {
    if (point.status !== "ready") return undefined;
    const controller = new AbortController();
    fetchNearbyPlaces(point.value, controller.signal)
      .then((value) => setPlaces({ status: "ready", value }))
      .catch(() => {
        if (!controller.signal.aborted) setPlaces({ status: "failed" });
      });
    return () => controller.abort();
  }, [point]);

  // Create the map once the project is located.
  useEffect(() => {
    if (point.status !== "ready" || !mapElement.current) return undefined;
    const map = L.map(mapElement.current, { zoomControl: true, scrollWheelZoom: true }).setView([point.value.lat, point.value.lon], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(map);
    L.marker([point.value.lat, point.value.lon], { icon: projectIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindTooltip(escapeHtml(project.name), { permanent: true, direction: "top", offset: [0, -16], className: "map-project-label" });
    L.circle([point.value.lat, point.value.lon], { radius: 1000, color: "#d6b25e", weight: 1, opacity: 0.5, fillOpacity: 0.03 }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // The container may still be settling its size inside the layout.
    const resize = window.setTimeout(() => map.invalidateSize(), 150);
    return () => {
      window.clearTimeout(resize);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersRef.current.clear();
    };
  }, [point, project.name]);

  const visiblePlaces = useMemo(
    () => (places.status === "ready" ? places.value.filter((place) => enabled.has(place.category)) : []),
    [enabled, places],
  );

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    for (const place of visiblePlaces) {
      const marker = L.marker([place.lat, place.lon], { icon: markerIcon(CATEGORY_STYLE[place.category].color) })
        .bindPopup(`<strong>${escapeHtml(place.name)}</strong><br/>${escapeHtml(t("map.walk", { min: place.walkMinutes }))}`);
      marker.addTo(layer);
      markersRef.current.set(place.id, marker);
    }
  }, [t, visiblePlaces, point]);

  const toggleCategory = (category: PlaceCategory) =>
    setEnabled((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });

  const focusPlace = (place: NearbyPlace) => {
    mapRef.current?.flyTo([place.lat, place.lon], 17, { duration: 0.6 });
    markersRef.current.get(place.id)?.openPopup();
  };

  const copyAddress = () => {
    void navigator.clipboard?.writeText(project.location).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  };

  const directionsUrl =
    point.status === "ready"
      ? `https://www.google.com/maps/dir/?api=1&destination=${point.value.lat},${point.value.lon}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(project.location)}`;

  const countBy = (category: PlaceCategory) =>
    places.status === "ready" ? places.value.filter((place) => place.category === category).length : 0;

  return (
    <section className="location-live">
      <div className="location-live__map" dir="ltr">
        {point.status === "loading" && <div className="location-live__state">{t("map.loading")}</div>}
        {point.status === "failed" && <div className="location-live__state">{t("map.failed")}</div>}
        <div ref={mapElement} className="location-live__canvas" />
      </div>

      <aside className="location-live__panel">
        <div className="location-live__address">
          <span className="eyebrow">{t("overview.address")}</span>
          <strong dir="auto">{project.location}</strong>
          <div className="action-row">
            <a className="mini-button" href={directionsUrl} target="_blank" rel="noreferrer">
              <Navigation size={15} />
              {t("map.navigate")}
            </a>
            <button className="mini-button" type="button" onClick={copyAddress}>
              <Copy size={15} />
              {copied ? t("common.copied") : t("map.copyAddress")}
            </button>
          </div>
        </div>

        {project.locationDescription && (
          <div className="location-live__about">
            <span className="eyebrow">{project.neighborhood || t("location.aboutArea")}</span>
            <p dir="auto">{project.locationDescription}</p>
          </div>
        )}

        <div className="location-live__heading">
          <h2>{t("map.nearby")}</h2>
          <span>{t("map.radius")}</span>
        </div>

        <div className="poi-filters" role="group" aria-label={t("map.nearby")}>
          {PLACE_CATEGORIES.map((category) => {
            const { color, icon: Icon } = CATEGORY_STYLE[category];
            const active = enabled.has(category);
            return (
              <button
                key={category}
                type="button"
                className={active ? "poi-filter active" : "poi-filter"}
                aria-pressed={active}
                onClick={() => toggleCategory(category)}
                style={{ ["--poi-color" as string]: color }}
              >
                <Icon size={15} />
                {t(`poi.${category}`)}
                {places.status === "ready" && <small>{countBy(category)}</small>}
              </button>
            );
          })}
        </div>

        <div className="poi-list">
          {places.status === "loading" && point.status !== "failed" && <p className="poi-list__state">{t("map.poisLoading")}</p>}
          {places.status === "failed" && <p className="poi-list__state">{t("map.poisFailed")}</p>}
          {places.status === "ready" && visiblePlaces.length === 0 && <p className="poi-list__state">{t("map.noPois")}</p>}
          {PLACE_CATEGORIES.filter((category) => enabled.has(category)).map((category) => {
            const items = visiblePlaces.filter((place) => place.category === category);
            if (items.length === 0) return null;
            const { color, icon: Icon } = CATEGORY_STYLE[category];
            return (
              <section key={category} className="poi-group">
                <h3 style={{ color }}>
                  <Icon size={16} />
                  {t(`poi.${category}`)}
                </h3>
                <ul>
                  {items.map((place) => (
                    <li key={place.id}>
                      <button type="button" onClick={() => focusPlace(place)}>
                        <span dir="auto">{place.name}</span>
                        <small>{t("map.walk", { min: place.walkMinutes })}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </aside>
    </section>
  );
}

