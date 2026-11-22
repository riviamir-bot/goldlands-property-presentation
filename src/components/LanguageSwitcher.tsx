import { useI18n } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/strings";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div className="language-switcher" role="group" aria-label={t("nav.language")}>
      {LANGUAGES.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === language ? "active" : ""}
          aria-pressed={item.id === language}
          lang={item.id}
          onClick={() => setLanguage(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
