import { useCallback, useEffect, useState } from "react";
import { Box, Building2, Car, Images, Info, ListChecks, MapPin } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { ContactForm } from "../components/ContactForm";
import { FeatureBlocks } from "../components/FeatureBlocks";
import {
  AboutSection,
  GlassBackdrop,
  Panel,
  ProjectLogo,
  SectionBar,
  TileGrid,
  projectSummary,
  type GlassTile,
} from "../components/GoldViewParts";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { PlanViewer } from "../components/PlanViewer";
import { StatusBadge } from "../components/StatusBadge";
import { TechnicalSpecAccordion } from "../components/TechnicalSpecAccordion";
import { useI18n } from "../i18n/LanguageContext";
import { fetchSharedPresentation, type SharedPresentationPayload } from "../services/presentationApi";
import type { Project } from "../types";
import { formatNumber, formatPrice } from "../utils/format";
import { GalleryScreen } from "./GalleryScreen";
import { LocationScreen } from "./LocationScreen";
import { Model3dScreen } from "./Model3dScreen";
import "../gold-view.css";

type State = { kind: "loading" } | { kind: "expired" } | { kind: "error" } | { kind: "ready"; payload: SharedPresentationPayload };

/** The open section lives in the address (#apartments), so the phone's back button returns to the tiles. */
function useSection() {
  const read = () => decodeURIComponent(window.location.hash.replace(/^#/, ""));
  const [section, setSection] = useState(read);
  useEffect(() => {
    const onChange = () => {
      setSection(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const close = useCallback(() => {
    if (window.history.length > 1 && window.location.hash) window.history.back();
    else window.location.hash = "";
  }, []);
  return { section, close };
}

/** Tiles of one project's sections, shared by the client page and the marketer presentation. */
export function projectTiles(
  project: Project,
  t: ReturnType<typeof useI18n>["t"],
  apartments: { count: number; available: number },
  extra: GlassTile[] = [],
): GlassTile[] {
  const hasImages = Object.values(project.gallery).some((images) => images.length > 0);
  return [
    { id: "about", icon: Info, title: t("gv.about"), hint: t("gv.tile.about") },
    ...(apartments.count
      ? [
          {
            id: "apartments",
            icon: Building2,
            title: t("gv.tile.apartments"),
            hint: apartments.available ? t("gv.tile.available", { n: apartments.available }) : t("gv.tile.selected"),
          },
        ]
      : []),
    ...extra,
    ...(hasImages ? [{ id: "gallery", icon: Images, title: t("gv.tile.gallery"), hint: t("gv.tile.galleryHint") }] : []),
    ...((project.technicalSpecSections ?? []).length ? [{ id: "spec", icon: ListChecks, title: t("section.technical"), hint: t("gv.tile.spec") }] : []),
    ...(project.featureBlocks ?? []).map((block) => ({
      id: `feature-${block.key}`,
      icon: block.key.includes("parking") ? Car : Info,
      title: block.title,
      hint: t("gv.tile.feature"),
    })),
    ...(project.model3dUrl ? [{ id: "model3d", icon: Box, title: t("section.model3d"), hint: t("gv.tile.model3d") }] : []),
    ...(project.address.trim() || project.city.trim() ? [{ id: "location", icon: MapPin, title: t("section.location"), hint: t("gv.tile.location") }] : []),
  ];
}

/** Section screens both the client page and the marketer presentation show the same way. */
export function SharedSection({ id, project }: { id: string; project: Project }) {
  if (id === "about") return <AboutSection project={project} />;
  if (id === "gallery") return <GalleryScreen project={project} />;
  if (id === "spec") {
    return (
      <>
        <TechnicalSpecAccordion defaultOpenIds={[]} sections={project.technicalSpecSections ?? []} variant="screen" />
        {project.legalDisclaimer && (
          <p className="gv-disclaimer" dir="auto">
            {project.legalDisclaimer}
          </p>
        )}
      </>
    );
  }
  if (id.startsWith("feature-")) {
    const block = (project.featureBlocks ?? []).find((item) => `feature-${item.key}` === id);
    return block ? <FeatureBlocks blocks={[block]} /> : null;
  }
  if (id === "model3d") return <Model3dScreen project={project} />;
  if (id === "location") return <LocationScreen project={project} />;
  return null;
}

/** Gold View: the page a client opens from a link the marketer sent. Tiles over the project render; each opens a section. */
export function ClientShareApp({ token }: { token: string }) {
  const { t, dir, language, setLanguage } = useI18n();
  const [state, setState] = useState<State>({ kind: "loading" });
  const { section, close } = useSection();

  useEffect(() => {
    let cancelled = false;
    void fetchSharedPresentation(token).then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") {
        setLanguage(result.payload.language);
        setState({ kind: "ready", payload: result.payload });
      } else setState({ kind: result.kind });
    });
    return () => {
      cancelled = true;
    };
  }, [setLanguage, token]);

  if (state.kind !== "ready") {
    return (
      <main className="gv gv-status" dir={dir}>
        <BrandLogo surface="gold" />
        <p>{state.kind === "loading" ? t("client.loading") : t("client.expired")}</p>
      </main>
    );
  }

  const { project, apartments, showPrices } = state.payload;
  const tiles = projectTiles(project, t, {
    count: apartments.length,
    available: apartments.filter((apartment) => apartment.status === "available").length,
  });
  const known = section === "contact" || tiles.some((tile) => tile.id === section);
  const current = known ? section : "";
  const summary = projectSummary(project, t, language);
  const titleOf = (id: string) => (id === "contact" ? t("gv.contact.title") : (tiles.find((tile) => tile.id === id)?.title ?? ""));

  return (
    <div className="gv" dir={dir}>
      <GlassBackdrop image={project.heroImage} dim={Boolean(current)} />

      {!current ? (
        <main className="gv-home">
          <header className="gv-top">
            <ProjectLogo project={project} />
            <BrandLogo compact surface="gold" />
          </header>

          <div className="gv-home__body">
            <div className="gv-home__title">
              <h1 dir="auto">{project.location || project.name}</h1>
              {summary && <p dir="auto">{summary}</p>}
            </div>
            <TileGrid label={project.name} tiles={tiles} />
            <a className="gv-cta" href="#contact">
              <strong>{t("gv.cta.title")}</strong>
              <span>{t("gv.cta.hint")}</span>
            </a>
            <div className="gv-home__lang">
              <LanguageSwitcher />
            </div>
          </div>
        </main>
      ) : (
        <main className="gv-section-view">
          <SectionBar title={titleOf(current)} onBack={close} />
          <div className="gv-section-body">
            {current === "apartments" ? (
              <div className="gv-apartments">
                {apartments.map((apartment) => (
                  <article key={apartment.id} className="gv-panel gv-apartment">
                    <header>
                      <h2>{t("apartment.title", { n: apartment.number })}</h2>
                      <StatusBadge status={apartment.status} />
                    </header>
                    <dl>
                      <div><dt>{t("field.floor")}</dt><dd>{apartment.floor}</dd></div>
                      <div><dt>{t("field.rooms")}</dt><dd>{formatNumber(apartment.rooms)}</dd></div>
                      <div><dt>{t("field.area")}</dt><dd>{formatNumber(apartment.apartmentArea, t("unit.sqm"))}</dd></div>
                      <div><dt>{t("field.balcony")}</dt><dd>{formatNumber(apartment.balconyArea, t("unit.sqm"))}</dd></div>
                    </dl>
                    {showPrices && apartment.status !== "sold" && apartment.price > 0 && (
                      <p className="gv-apartment__price">{formatPrice(apartment.price)}</p>
                    )}
                    {apartment.planUrl && <PlanViewer apartment={apartment} />}
                  </article>
                ))}
              </div>
            ) : current === "contact" ? (
              <Panel>
                <p className="gv-lead">{t("gv.contact.lead")}</p>
                <ContactForm initialProjectIds={[project.id]} fallbackProjects={[{ id: project.id, name: project.name, city: project.city }]} />
              </Panel>
            ) : (
              <SharedSection id={current} project={project} />
            )}
          </div>
          {current !== "contact" && (
            <footer className="gv-section-footer">
              <a className="gv-cta gv-cta--compact" href="#contact">
                <strong>{t("gv.cta.title")}</strong>
              </a>
            </footer>
          )}
        </main>
      )}
    </div>
  );
}
