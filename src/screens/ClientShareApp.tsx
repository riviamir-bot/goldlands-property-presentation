import { useEffect, useState, type ReactNode } from "react";
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
import type { Project } from "../types";
import { formatMonthYear, formatNumber, formatPrice } from "../utils/format";
import { GalleryScreen } from "./GalleryScreen";
import { LocationScreen } from "./LocationScreen";
import { Model3dScreen } from "./Model3dScreen";
import "../gold-view.css";

type State = { kind: "loading" } | { kind: "expired" } | { kind: "error" } | { kind: "ready"; payload: SharedPresentationPayload };

const present = (value: string | undefined): value is string => Boolean(value && value.trim() && value.trim() !== "0");

/** Section title drawn as an architectural dimension line: the title sits on the line between two end ticks. */
function Heading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 className="gv-heading" id={id}>
      <span>{children}</span>
    </h2>
  );
}

function factValue(project: Project, label: string) {
  return project.facts?.find((fact) => fact.label.trim() === label)?.value ?? "";
}

/** Gold View: the page a client opens from a link the marketer sent. No sign-in; shows only what the marketer chose. */
export function ClientShareApp({ token }: { token: string }) {
  const { t, dir, language, setLanguage } = useI18n();
  const [state, setState] = useState<State>({ kind: "loading" });

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
        <BrandLogo surface="light" />
        <p>{state.kind === "loading" ? t("client.loading") : t("client.expired")}</p>
      </main>
    );
  }

  const { project, apartments, showPrices } = state.payload;
  const details = project.details;
  const hasImages = Object.values(project.gallery).some((images) => images.length > 0);
  const specSections = project.technicalSpecSections ?? [];
  const featureBlocks = project.featureBlocks ?? [];

  const facts = (
    [
      [t("gv.units"), project.stats.units],
      [t("gv.floors"), factValue(project, "קומות") || project.stats.floors],
      [t("gv.stage"), translateConstructionStage(details?.constructionStage ?? "", language)],
      [t("gv.completion"), formatMonthYear(details?.constructionCompletionDate ?? "", language) || factValue(project, "צפי סיום עבודה")],
    ] as Array<[string, string]>
  ).filter(([, value]) => present(value));

  const credits = (
    [
      [t("overview.developer"), details?.developerCompany ?? ""],
      [t("overview.architect"), project.architect ?? ""],
      [t("overview.bank"), details?.financingBank ?? ""],
      [t("overview.blockParcel"), [project.block, project.parcel].filter(present).join(" / ")],
    ] as Array<[string, string]>
  ).filter(([, value]) => present(value));

  return (
    <div className="gv" dir={dir}>
      <header className="gv-bar">
        <BrandLogo compact surface="light" />
        <div className="gv-bar__actions">
          <LanguageSwitcher />
        </div>
      </header>

      <section className="gv-hero" aria-labelledby="gv-project-name">
        {project.heroImage && <img className="gv-hero__image" src={project.heroImage} alt="" />}
        <div className="gv-hero__copy">
          {project.location && <p className="gv-hero__location" dir="auto">{project.location}</p>}
          <h1 id="gv-project-name" dir="auto">{project.name}</h1>
          {project.tagline && <p className="gv-hero__tagline" dir="auto">{project.tagline}</p>}
          <a className="gv-button" href="#gv-contact">{t("gv.cta")}</a>
        </div>
        {project.heroImage && <span className="gv-hero__note">{t("gallery.illustrative")}</span>}
      </section>

      {facts.length > 0 && (
        <dl className="gv-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd dir="auto">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <main className="gv-main">
        {(project.description || credits.length > 0) && (
          <section className="gv-section gv-about">
            <Heading>{t("gv.about")}</Heading>
            <div className="gv-about__grid">
              <div className="gv-about__text">
                {project.description.split(/\n+/).map((paragraph) => (
                  <p key={paragraph} dir="auto">{paragraph}</p>
                ))}
              </div>
              {credits.length > 0 && (
                <aside className="gv-about__credits">
                  <dl>
                    {credits.map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd dir="auto">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {project.developerAbout && (
                    <details className="gv-disclosure">
                      <summary>{t("overview.aboutDeveloper")}</summary>
                      <p dir="auto">{project.developerAbout}</p>
                      {project.developerWebsite && (
                        <a href={project.developerWebsite} target="_blank" rel="noreferrer">{t("overview.developerWebsite")}</a>
                      )}
                    </details>
                  )}
                </aside>
              )}
            </div>
          </section>
        )}

        {apartments.length > 0 && (
          <section className="gv-section">
            <Heading>{t("client.selected")}</Heading>
            <div className="gv-apartments">
              {apartments.map((apartment) => (
                <article key={apartment.id} className="gv-apartment">
                  <header>
                    <h3>{t("apartment.title", { n: apartment.number })}</h3>
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
          </section>
        )}

        {hasImages && (
          <section className="gv-section gv-gallery">
            <Heading>{t("section.gallery")}</Heading>
            <GalleryScreen project={project} />
          </section>
        )}

        {featureBlocks.length > 0 && (
          <section className="gv-section gv-features">
            <FeatureBlocks blocks={featureBlocks} />
          </section>
        )}

        {specSections.length > 0 && (
          <section className="gv-section gv-spec">
            <Heading>{t("section.technical")}</Heading>
            <TechnicalSpecAccordion defaultOpenIds={[]} sections={specSections} variant="screen" />
          </section>
        )}

        {project.model3dUrl && (
          <section className="gv-section">
            <Heading>{t("section.model3d")}</Heading>
            <Model3dScreen project={project} />
          </section>
        )}

        {(project.address.trim() || project.city.trim()) && (
          <section className="gv-section gv-location">
            <Heading>{t("section.location")}</Heading>
            <LocationScreen project={project} />
          </section>
        )}

        <section className="gv-section gv-contact" aria-labelledby="gv-contact">
          <Heading id="gv-contact">{t("gv.contact.title")}</Heading>
          <p className="gv-contact__lead">{t("gv.contact.lead")}</p>
          <ContactForm
            initialProjectIds={[project.id]}
            fallbackProjects={[{ id: project.id, name: project.name, city: project.city }]}
          />
        </section>
      </main>

      <footer className="gv-footer">
        {project.legalDisclaimer && <p dir="auto">{project.legalDisclaimer}</p>}
        <p>{t("gv.footer")}</p>
      </footer>
    </div>
  );
}
