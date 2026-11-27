import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react";
import { useI18n } from "../i18n/LanguageContext";
import { translateConstructionStage } from "../i18n/project-values";
import type { Project } from "../types";
import { formatMonthYear } from "../utils/format";
import { BrandLogo } from "./BrandLogo";

/** Shared building blocks of the Gold View look, used by the client page and the marketer presentation. */

export interface GlassTile {
  id: string;
  icon: LucideIcon;
  title: string;
  hint: string;
}

export const present = (value: string | undefined): value is string => Boolean(value && value.trim() && value.trim() !== "0");

export function factValue(project: Project, label: string) {
  return project.facts?.find((fact) => fact.label.trim() === label)?.value ?? "";
}

/** The project's own logo, kept in public/project-logos/<project id>.png. Falls back to the project name. */
export function ProjectLogo({ project }: { project: Project }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="gv-project-name">{project.name}</span>;
  return <img className="gv-project-logo" src={`/project-logos/${project.id}.png`} alt={project.name} onError={() => setFailed(true)} />;
}

/** Top bar on every Gold View screen: project logo and GOLDLANDS, each on its own side, in their original colours. */
export function GvHeader({ project, onBrandClick }: { project?: Project; onBrandClick?: () => void }) {
  return (
    <header className="gv-header" dir="rtl">
      {project ? <ProjectLogo project={project} /> : <span />}
      <BrandLogo compact surface="gold" onClick={onBrandClick} />
    </header>
  );
}

/** The render behind every Gold View screen; dimmed and blurred behind section screens. */
export function GlassBackdrop({ image, dim }: { image?: string; dim?: boolean }) {
  return (
    <div className={`gv-backdrop${dim ? " gv-backdrop--dim" : ""}`} aria-hidden="true">
      {image && <img src={image} alt="" />}
    </div>
  );
}

export function projectSummary(project: Project, t: ReturnType<typeof useI18n>["t"], language: ReturnType<typeof useI18n>["language"]) {
  const completion = formatMonthYear(project.details?.constructionCompletionDate ?? "", language) || factValue(project, "צפי סיום עבודה");
  return [present(project.stats.units) ? `${project.stats.units} ${t("gv.units")}` : "", completion ? `${t("gv.completion")} ${completion}` : ""]
    .filter(Boolean)
    .join(" · ");
}

export function TileGrid({ label, tiles, onOpen }: { label: string; tiles: GlassTile[]; onOpen?: (id: string) => void }) {
  return (
    <nav className="gv-tiles" aria-label={label}>
      {tiles.map(({ id, icon: Icon, title, hint }) => {
        const content = (
          <>
            <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
            <strong>{title}</strong>
            <span>{hint}</span>
          </>
        );
        return onOpen ? (
          <button key={id} type="button" className="gv-tile" onClick={() => onOpen(id)}>
            {content}
          </button>
        ) : (
          <a key={id} className="gv-tile" href={`#${id}`}>
            {content}
          </a>
        );
      })}
    </nav>
  );
}

export function SectionBar({ title, onBack, children }: { title: string; onBack: () => void; children?: ReactNode }) {
  const { t, dir } = useI18n();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;
  return (
    <header className="gv-section-bar">
      <button type="button" className="gv-back" onClick={onBack}>
        <BackIcon size={20} aria-hidden="true" />
        {t("nav.back")}
      </button>
      <h1 dir="auto">{title}</h1>
      {children && <div className="gv-section-bar__end">{children}</div>}
    </header>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return <section className="gv-panel">{children}</section>;
}

export function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n+/)
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index} dir="auto">
            {paragraph}
          </p>
        ))}
    </>
  );
}

/** "About the project": description, key facts, developer. Internal details never appear here. */
export function AboutSection({ project }: { project: Project }) {
  const { t, language } = useI18n();
  const details = project.details;
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
        {project.tagline && (
          <p className="gv-lead" dir="auto">
            {project.tagline}
          </p>
        )}
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

/** Disclaimer shown at the bottom of the client page. */
export function LegalFooter() {
  const { t } = useI18n();
  return (
    <div className="gv-legal">
      <p dir="auto">{t("legal.disclaimer")}</p>
    </div>
  );
}
