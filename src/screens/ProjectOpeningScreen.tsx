import { Building2, ExternalLink } from "lucide-react";
import { ProjectLogoSlot } from "../components/ProjectLogoSlot";
import { useI18n } from "../i18n/LanguageContext";
import type { MessageKey } from "../i18n/strings";
import type { Project } from "../types";
import { formatMonthYear } from "../utils/format";
import { translateConstructionStage, translateProjectType } from "../i18n/project-values";

interface ProjectOpeningScreenProps {
  project: Project;
}

type Row = [label: MessageKey, value: string];

const hasValue = (value: string | undefined): value is string => Boolean(value && value.trim() && value.trim() !== "0");

export function ProjectOpeningScreen({ project }: ProjectOpeningScreenProps) {
  const { t, language } = useI18n();
  const details = project.details;
  const mainImage = project.heroImage;
  const blockParcel = [project.block, project.parcel].filter(hasValue).join(" / ");

  const groups: Array<{ title: MessageKey; rows: Row[] }> = [
    {
      title: "overview.location",
      rows: [
        ["overview.address", project.address],
        ["overview.city", project.address.includes(project.city) ? "" : project.city],
        ["overview.type", translateProjectType(project.projectType, language)],
        ["overview.blockParcel", blockParcel],
      ],
    },
    {
      title: "overview.construction",
      rows: [
        ["overview.developer", details?.developerCompany ?? ""],
        ["overview.bank", details?.financingBank ?? ""],
        ["overview.stage", translateConstructionStage(details?.constructionStage ?? "", language)],
        ["overview.start", formatMonthYear(details?.constructionStartDate ?? "", language)],
        ["overview.completion", formatMonthYear(details?.constructionCompletionDate ?? "", language)],
      ],
    },
    {
      title: "overview.scope",
      rows: [
        ["overview.existingUnits", project.stats.existingApartments],
        ["overview.newUnits", project.stats.newApartments],
        ["overview.buildings", project.stats.buildings],
      ],
    },
  ];
  const visibleGroups = groups
    .map((group) => ({ ...group, rows: group.rows.filter(([, value]) => hasValue(value)) }))
    .filter((group) => group.rows.length > 0);

  const mix = (
    [
      [3, project.apartmentMix.threeRooms],
      [4, project.apartmentMix.fourRooms],
      [5, project.apartmentMix.fiveRooms],
    ] as const
  ).filter(([, count]) => hasValue(count));

  const headline: Array<[MessageKey, string]> = (
    [
      ["overview.units", project.stats.units],
      ["overview.stage", details?.constructionStage ?? ""],
      ["overview.completion", formatMonthYear(details?.constructionCompletionDate ?? "", language)],
    ] as Array<[MessageKey, string]>
  ).filter(([, value]) => hasValue(value));

  return (
    <section className="panel project-overview-panel">
      <div className="project-overview-layout">
        <section className="project-overview-visual" aria-label={project.name}>
          <div
            className={mainImage ? "project-overview-image" : "project-overview-image project-overview-image--empty"}
            style={mainImage ? { backgroundImage: `url("${mainImage}")` } : undefined}
          >
            {!mainImage && (
              <div className="project-overview-image__placeholder">
                <Building2 size={34} strokeWidth={1.3} />
                <strong>{project.name}</strong>
              </div>
            )}
          </div>
        </section>

        <section className="project-overview-copy">
          <div className="project-overview-title">
            <div className="project-overview-heading">
              <ProjectLogoSlot project={project} compact markOnly />
              <div>
                <span className="eyebrow" dir="auto">{project.location}</span>
                <h2 dir="auto">{project.name}</h2>
              </div>
            </div>
            {project.tagline && <p dir="auto">{project.tagline}</p>}
            {project.description && <p className="project-overview-description" dir="auto">{project.description}</p>}
          </div>

          {headline.length > 0 && (
            <div className="overview-stat-grid" aria-label={t("overview.scope")}>
              {headline.map(([label, value]) => (
                <article key={label}>
                  <span>{t(label)}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
          )}

          {mix.length > 0 && (
            <div className="overview-facts" aria-label={t("overview.mix")}>
              {mix.map(([rooms, count]) => (
                <span key={rooms}>
                  <b>{count}</b> × {t("overview.roomsN", { n: rooms })}
                </span>
              ))}
            </div>
          )}

          <div className="overview-fact-groups">
            {visibleGroups.map((group) => (
              <details className="overview-fact-group" key={group.title} open>
                <summary>{t(group.title)}</summary>
                <dl>
                  {group.rows.map(([label, value]) => (
                    <div key={label}>
                      <dt>{t(label)}</dt>
                      <dd dir="auto">{value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ))}
          </div>

          {details?.websiteUrl && (
            <a className="ghost-button project-website-link" href={details.websiteUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              {t("overview.website")}
            </a>
          )}
        </section>
      </div>
    </section>
  );
}
