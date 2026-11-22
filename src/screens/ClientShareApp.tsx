import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { PlanViewer } from "../components/PlanViewer";
import { StatusBadge } from "../components/StatusBadge";
import { useI18n } from "../i18n/LanguageContext";
import { fetchSharedPresentation, type SharedPresentationPayload } from "../services/presentationApi";
import { formatNumber, formatPrice } from "../utils/format";
import { whatsappUrl } from "../utils/handoff";
import { GalleryScreen } from "./GalleryScreen";
import { LocationScreen } from "./LocationScreen";
import { Model3dScreen } from "./Model3dScreen";
import { ProjectOpeningScreen } from "./ProjectOpeningScreen";

type State = { kind: "loading" } | { kind: "expired" } | { kind: "error" } | { kind: "ready"; payload: SharedPresentationPayload };

/** The page a client opens from a summary link. No sign-in; shows only what the marketer selected. */
export function ClientShareApp({ token }: { token: string }) {
  const { t, setLanguage } = useI18n();
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
      <main className="app-loading-screen">
        <strong>GOLDLANDS</strong>
        <span>{state.kind === "loading" ? t("client.loading") : t("client.expired")}</span>
      </main>
    );
  }

  const { project, apartments, showPrices, agent } = state.payload;
  const hasImages = Object.values(project.gallery).some((images) => images.length > 0);

  return (
    <div className="client-share">
      <header className="topbar client-share__header">
        <BrandLogo compact />
        <div className="client-share__header-actions">
          {agent?.name && <span className="client-share__agent">{t("client.from", { name: agent.name })}</span>}
          {agent?.phone && (
            <a className="gold-button gold-button--compact" href={whatsappUrl(agent.phone, project.name)} target="_blank" rel="noreferrer">
              <MessageCircle size={16} />
              WhatsApp
            </a>
          )}
          <LanguageSwitcher />
        </div>
      </header>

      <main className="client-share__main">
        <ProjectOpeningScreen project={project} />

        {apartments.length > 0 && (
          <section className="client-share__section">
            <h2>{t("client.selected")}</h2>
            <div className="client-share__apartments">
              {apartments.map((apartment) => (
                <article key={apartment.id} className="client-apartment">
                  <header>
                    <h3>{t("apartment.title", { n: apartment.number })}</h3>
                    <StatusBadge status={apartment.status} />
                  </header>
                  <dl>
                    <div><dt>{t("field.floor")}</dt><dd>{apartment.floor}</dd></div>
                    <div><dt>{t("field.rooms")}</dt><dd>{formatNumber(apartment.rooms)}</dd></div>
                    <div><dt>{t("field.area")}</dt><dd>{formatNumber(apartment.apartmentArea, t("unit.sqm"))}</dd></div>
                    <div><dt>{t("field.balcony")}</dt><dd>{formatNumber(apartment.balconyArea, t("unit.sqm"))}</dd></div>
                    {showPrices && apartment.status !== "sold" && (
                      <div><dt>{t("field.price")}</dt><dd>{formatPrice(apartment.price)}</dd></div>
                    )}
                  </dl>
                  {apartment.planUrl && <PlanViewer apartment={apartment} />}
                </article>
              ))}
            </div>
          </section>
        )}

        {hasImages && (
          <section className="client-share__section">
            <h2>{t("section.gallery")}</h2>
            <GalleryScreen project={project} />
          </section>
        )}

        {project.model3dUrl && (
          <section className="client-share__section">
            <h2>{t("section.model3d")}</h2>
            <Model3dScreen project={project} />
          </section>
        )}

        <section className="client-share__section">
          <h2>{t("section.location")}</h2>
          <LocationScreen project={project} />
        </section>
      </main>
    </div>
  );
}
