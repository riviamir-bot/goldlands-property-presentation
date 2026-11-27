import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { useI18n } from "../i18n/LanguageContext";

export interface ContactProjectOption {
  id: string;
  name: string;
  city: string;
}

interface ContactFormProps {
  /** Projects ticked when the form opens, e.g. the project the client is looking at. */
  initialProjectIds: string[];
  /** Fallback options when the list cannot be loaded. */
  fallbackProjects: ContactProjectOption[];
  medium?: "client_link" | "public_link";
}

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string; field?: string };

/** Lead form: the visitor ticks one or more projects; each becomes a lead in the marketing system. */
export function ContactForm({ initialProjectIds, fallbackProjects, medium = "client_link" }: ContactFormProps) {
  const { t } = useI18n();
  const [projects, setProjects] = useState<ContactProjectOption[]>(fallbackProjects);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialProjectIds));
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/contact", { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { projects?: ContactProjectOption[] } | null) => {
        if (body?.projects?.length) setProjects(body.projects);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const byCity = useMemo(() => {
    const groups = new Map<string, ContactProjectOption[]>();
    for (const project of projects) {
      const city = project.city || "";
      groups.set(city, [...(groups.get(city) ?? []), project]);
    }
    return [...groups.entries()];
  }, [projects]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email"),
          message: form.get("message"),
          company: form.get("company"),
          consent: form.get("consent") === "on",
          projectIds: [...selected],
          startedAt: startedAt.current,
          pageUrl: window.location.href,
          medium,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; field?: string };
      if (response.ok) setStatus({ kind: "sent" });
      else setStatus({ kind: "error", message: body.error || t("gv.contact.failed"), field: body.field });
    } catch {
      setStatus({ kind: "error", message: t("gv.contact.failed") });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="gv-contact__sent" role="status">
        <Check size={28} aria-hidden="true" />
        <p>{t("gv.contact.sent")}</p>
      </div>
    );
  }

  const invalid = (name: string) => (status.kind === "error" && status.field === name ? true : undefined);

  return (
    <form className="gv-contact__form" onSubmit={submit} noValidate>
      <fieldset className="gv-contact__projects" aria-invalid={invalid("projectIds")}>
        <legend>{t("gv.contact.projects")}</legend>
        {byCity.map(([city, items]) => (
          <div className="gv-contact__city" key={city || "-"}>
            {city && <span className="gv-contact__city-name">{city}</span>}
            <div className="gv-contact__chips">
              {items.map((project) => (
                <label className="gv-chip" key={project.id}>
                  <input type="checkbox" checked={selected.has(project.id)} onChange={() => toggle(project.id)} />
                  <span>{project.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      <div className="gv-contact__fields">
        <label className="gv-field">
          <span>{t("gv.contact.name")}</span>
          <input name="name" autoComplete="name" required minLength={2} maxLength={120} aria-invalid={invalid("name")} />
        </label>
        <label className="gv-field">
          <span>{t("gv.contact.phone")}</span>
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required maxLength={40} aria-invalid={invalid("phone")} />
        </label>
        <label className="gv-field">
          <span>{t("gv.contact.email")}</span>
          <input name="email" type="email" autoComplete="email" dir="ltr" maxLength={200} aria-invalid={invalid("email")} />
        </label>
        <label className="gv-field gv-field--wide">
          <span>{t("gv.contact.message")}</span>
          <textarea name="message" rows={3} maxLength={1500} />
        </label>
        <label className="gv-honeypot" aria-hidden="true">
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="gv-consent">
        <input type="checkbox" name="consent" required aria-invalid={invalid("consent")} />
        <span>{t("gv.contact.consent")}</span>
      </label>

      {status.kind === "error" && (
        <p className="gv-contact__error" role="alert">
          {status.message}
        </p>
      )}

      <button className="gv-button" type="submit" disabled={status.kind === "sending" || selected.size === 0}>
        {status.kind === "sending" ? t("gv.contact.sending") : t("gv.contact.submit")}
      </button>
    </form>
  );
}
