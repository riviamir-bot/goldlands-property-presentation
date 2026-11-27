import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, X } from "lucide-react";
import { useI18n } from "../i18n/LanguageContext";
import { LANGUAGES, translate, type Language } from "../i18n/strings";
import { createShareLink } from "../services/presentationApi";
import type { Apartment, Project } from "../types";
import { formatNumber } from "../utils/format";
import { whatsappUrl } from "../utils/handoff";

interface ShareDialogProps {
  project: Project;
  apartments: Apartment[];
  defaultShowPrices: boolean;
  withToken: <T>(run: (token: string) => Promise<T>) => Promise<T | null>;
  onClose: () => void;
}

export function ShareDialog({ project, apartments, defaultShowPrices, withToken, onClose }: ShareDialogProps) {
  const { t, language } = useI18n();
  const projectOnly = apartments.length === 0;
  const [showPrices, setShowPrices] = useState(defaultShowPrices);
  const [shareLanguage, setShareLanguage] = useState<Language>(language);
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "creating" } | { kind: "ready"; url: string } | { kind: "error"; message: string }>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const create = async () => {
    setState({ kind: "creating" });
    const result = await withToken((token) =>
      createShareLink(token, { projectId: project.id, apartmentIds: apartments.map((a) => a.id), showPrices: projectOnly ? false : showPrices, language: shareLanguage }),
    );
    if (result?.kind === "ok") setState({ kind: "ready", url: result.url });
    else setState({ kind: "error", message: (result?.kind === "error" && result.message) || t("share.error") });
  };

  const message = state.kind === "ready" ? translate(shareLanguage, projectOnly ? "share.messageProject" : "share.message", { project: project.name, url: state.url }) : "";

  const copy = () => {
    if (state.kind !== "ready") return;
    void navigator.clipboard?.writeText(state.url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="drawer-backdrop drawer-backdrop--center" onClick={onClose} role="presentation">
      <section className="share-dialog" role="dialog" aria-modal="true" aria-label={projectOnly ? t("share.titleProject") : t("share.title")} onClick={(event) => event.stopPropagation()}>
        <header className="apartment-drawer__header">
          <h2>{projectOnly ? t("share.titleProject") : t("share.title")}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label={t("common.close")}>
            <X size={20} />
          </button>
        </header>

        <div className="share-dialog__body">
          <p className="share-dialog__intro">{projectOnly ? t("share.introProject") : t("share.intro")}</p>

          {!projectOnly && (
          <div>
            <span className="eyebrow">{t("share.apartments")}</span>
            <ul className="share-dialog__apartments">
              {apartments.map((apartment) => (
                <li key={apartment.id}>
                  {t("apartment.title", { n: apartment.number })} · {formatNumber(apartment.rooms)} {t("field.rooms")} · {formatNumber(apartment.apartmentArea, t("unit.sqm"))}
                </li>
              ))}
            </ul>
          </div>
          )}

          {state.kind !== "ready" ? (
            <>
              {!projectOnly && (
              <label className="share-dialog__check">
                <input type="checkbox" checked={showPrices} onChange={(event) => setShowPrices(event.currentTarget.checked)} />
                {t("share.includePrices")}
              </label>
              )}

              <label className="share-dialog__field">
                <span>{t("share.language")}</span>
                <select value={shareLanguage} onChange={(event) => setShareLanguage(event.currentTarget.value as Language)}>
                  {LANGUAGES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id === "he" ? "עברית" : item.id === "en" ? "English" : "Français"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="share-dialog__field">
                <span>{t("share.phone")}</span>
                <input type="tel" dir="ltr" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(event.currentTarget.value)} placeholder="050-000-0000" />
              </label>

              {state.kind === "error" && <p role="alert" className="share-dialog__error">{state.message}</p>}

              <button className="gold-button gold-button--wide" type="button" onClick={() => void create()} disabled={state.kind === "creating"}>
                {state.kind === "creating" ? t("share.creating") : t("share.create")}
              </button>
            </>
          ) : (
            <div className="share-dialog__ready">
              <strong>{t("share.ready")}</strong>
              <div className="share-dialog__link" dir="ltr">
                {state.url}
              </div>
              <div className="action-row">
                <a className="gold-button" href={whatsappUrl(phone, message)} target="_blank" rel="noreferrer">
                  <MessageCircle size={17} />
                  {t("share.whatsapp")}
                </a>
                <button className="ghost-button" type="button" onClick={copy}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? t("common.copied") : t("share.copyLink")}
                </button>
              </div>
              <small>{t("share.validity")}</small>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
