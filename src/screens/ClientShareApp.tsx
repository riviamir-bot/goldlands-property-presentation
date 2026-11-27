import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Box, Building2, Car, Images, Info, ListChecks, MapPin, type LucideIcon } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { ContactForm } from "../components/ContactForm";
import { FeatureBlocks } from "../components/FeatureBlocks";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { PlanViewer } from "../components/PlanViewer";
import { StatusBadge } from "../components/StatusBadge";
import { TechnicalSpecAccordion } from "../components/TechnicalSpecAccordion";
import { useI18n } from "../i18n/LanguageContext";
import { translateConstructionStage } from "../i18n/project-values";
import { fetchSharedPresentation, type SharedPresentationPayload } from "../services/presentationApi";
import type { Project, ProjectFeatureBlock } from "../types";
import { formatMonthYear, formatNumber, formatPrice } from "../utils/format";
import { GalleryScreen } from "./GalleryScreen";
import { LocationScreen } from "./LocationScreen";
import { Model3dScreen } from "./Model3dScreen";
import "../gold-view.css";

type State = { kind: "loading" } | { kind: "expired" } | { kind: "error" } | { kind: "ready"; payload: SharedPresentationPayload };

interface Tile {
  id: string;
  icon: LucideIcon;
  title: string;
  hint: string;
}

const present = (value: string | undefined): value is string => Boolean(value && value.trim() && value.trim() !== "0");

function factValue(project: Project, label: string) {
  return project.facts?.find((fact) => fact.label.trim() === label)?.value ?? "";
}

/** The project's own logo, kept in public/project-logos/<project id>.png. Falls back to the project name. */
function ProjectLogo({ project }: { project: Project }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="gv-project-name">{project.name}</span>;
  return (
    <img
      className="gv-project-logo"
      src={`/project-logos/${project.id}.png`}
      alt={project.name}
      onError={() => setFailed(true)}
    />
  );
}

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
        <BrandLogo />
        <p>{state.kind === "loading" ? t("client.loading") : t("client.expired")}</p>
      </main>
    );
  }

  const { project, apartments, showPrices } = state.payload;
  const details = project.details;
  const hasImages = Object.values(project.gallery).some((images) => images.length > 0);
  const specSections = project.technicalSpecSections ?? [];
  const featureBlocks = project.featureBlocks ?? [];
  const available = apartments.filter((apartment) => apartment.status === "available").length;
  const completion = formatMonthYear(details?.constructionCompletionDate ?? "", language) || factValue(project, "צפי סיום עבודה");
  const summary = [present(project.stats.units) ? `${project.stats.units} ${t("gv.units")}` : "", completion ? `${t("gv.completion")} ${completion}` : ""]
    .filter(Boolean)
    .join(" · ");

  const tiles: Tile[] = [
    { id: "about", icon: Info, title: t("gv.about"), hint: t("gv.tile.about") },
    ...(apartments.length
      ? [{ id: "apartments", icon: Building2, title: t("gv.tile.apartments"), hint: available ? t("gv.tile.available", { n: available }) : t("gv.tile.selected") }]
      : []),
    ...(hasImages ? [{ id: "gallery", icon: Images, title: t("gv.tile.gallery"), hint: t("gv.tile.galleryHint") }] : []),
    ...(specSections.length ? [{ id: "spec", icon: ListChecks, title: t("section.technical"), hint: t("gv.tile.spec") }] : []),
    ...featureBlocks.map((block) => ({
      id: `feature-${block.key}`,
      icon: block.key.includes("parking") ? Car : Info,
      title: block.title,
      hint: t("gv.tile.feature"),
    })),
    ...(project.model3dUrl ? [{ id: "model3d", icon: Box, title: t("section.model3d"), hint: t("gv.tile.model3d") }] : []),
    ...(project.address.trim() || project.city.trim() ? [{ id: "location", icon: MapPin, title: t("section.location"), hint: t("gv.tile.location") }] : []),
  ];

  const known = section === "contact" || tiles.some((tile) => tile.id === section);
  const current = known ? section : "";
  const titleOf = (id: string) => (id === "contact" ? t("gv.contact.title") : tiles.find((tile) => tile.id === id)?.title ?? "");

  return (
    <div className="gv" dir={dir}>
      <div className={`gv-backdrop${current ? " gv-backdrop--dim" : ""}`} aria-hidden="true">
        {project.heroImage && <img src={project.heroImage} alt="" />}
      </div>

      {!current ? (
        <main className="gv-home">
          <header className="gv-top">
            <ProjectLogo project={project} />
            <BrandLogo compact surface="light" />
          </header>

          <div className="gv-home__body">
            <div className="gv-home__title">
              <h1 dir="auto">{project.location || project.name}</h1>
              {summary && <p dir="auto">{summary}</p>}
            </div>

            <nav className="gv-tiles" aria-label={project.name}>
              {tiles.map(({ id, icon: Icon, title, hint }) => (
                <a key={id} className="gv-tile" href={`#${id}`}>
                  <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
                  <strong>{title}</strong>
                  <span>{hint}</span>
                </a>
              ))}
            </nav>

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
          <header className="gv-section-bar">
            <button type="button" className="gv-back" onClick={close}>
              <ArrowRight size={20} aria-hidden="true" />
              {t("nav.back")}
            </button>
            <h1 dir="auto">{titleOf(current)}</h1>
          </header>

          <div className="gv-section-body">
            <SectionContent id={current} project={project} apartments={apartments} showPrices={showPrices} featureBlocks={featureBlocks} />
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

interface SectionProps {
  id: string;
  project: Project;
  apartments: SharedPresentationPayload["apartments"];
  showPrices: boolean;
  featureBlocks: ProjectFeatureBlock[];
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="gv-panel">{children}</section>;
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n+/)
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index} dir="auto">{paragraph}</p>
        ))}
    </>
  );
}

function SectionContent({ id, project, apartments, showPrices, featureBlocks }: SectionProps) {
  const { t, language } = useI18n();
  const details = project.details;

  if (id === "about") {
    const facts = (
      [
        [t("gv.units"), project.stats.units],
        [t("gv.floors"), factValue(project, "קומות") || project.stats.floors],
        [t("gv.stage"), translateConstructionStage(details?.constructionStage ?? "", language)],
        [t("gv.completion"), formatMonthYear(details?.constructionCompletionDate ?? "", language) || factValue(project, "צפי סיום עבודה")],
        [t("overview.developer"), details?.developerCompany ?? ""],
        [t("overview.architect"), project.architect ?? ""],
      ] as Array<[string, string]>
    ).filter(([, value]) => present(value));
    return (
      <>
        <Panel>
          {project.tagline && <p className="gv-lead" dir="auto">{project.tagline}</p>}
          <Paragraphs text={project.description} />
        </Panel>
        {facts.length > 0 && (
          <Panel>
            <dl className="gv-facts">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd dir="auto">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        )}
        {project.developerAbout && (
          <Panel>
            <h2>{t("overview.aboutDeveloper")}</h2>
            <Paragraphs text={project.developerAbout} />
          </Panel>
        )}
      </>
    );
  }

  if (id === "apartments") {
    return (
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
    );
  }

  if (id === "gallery") return <GalleryScreen project={project} />;

  if (id === "spec") {
    return (
      <>
        <TechnicalSpecAccordion defaultOpenIds={[]} sections={project.technicalSpecSections ?? []} variant="screen" />
        {project.legalDisclaimer && <p className="gv-disclaimer" dir="auto">{project.legalDisclaimer}</p>}
      </>
    );
  }

  if (id.startsWith("feature-")) {
    const block = featureBlocks.find((item) => `feature-${item.key}` === id);
    return block ? <FeatureBlocks blocks={[block]} /> : null;
  }

  if (id === "model3d") return <Model3dScreen project={project} />;

  if (id === "location") return <LocationScreen project={project} />;

  if (id === "contact") {
    return (
      <Panel>
        <p className="gv-lead">{t("gv.contact.lead")}</p>
        <ContactForm initialProjectIds={[project.id]} fallbackProjects={[{ id: project.id, name: project.name, city: project.city }]} />
      </Panel>
    );
  }

  return null;
}
