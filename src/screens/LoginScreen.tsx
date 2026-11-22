import { useState, type FormEvent } from "react";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useI18n } from "../i18n/LanguageContext";

interface LoginScreenProps {
  onLogin: (credentials: { email: string; password: string }) => void | Promise<void>;
  isLoading?: boolean;
  isConfigured?: boolean;
  error?: string | null;
  /** Shown instead of the form while a sign-in handed over from the marketing system completes. */
  isHandoff?: boolean;
}

export function LoginScreen({ onLogin, isLoading = false, isConfigured = true, error, isHandoff = false }: LoginScreenProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConfigured) return;
    void onLogin({ email, password });
  };

  return (
    <main className="login-screen">
      <div className="login-screen__image" />
      <section className="login-panel" aria-label={t("login.submit")}>
        <BrandLogo />
        <LanguageSwitcher />
        {isHandoff ? (
          <p className="login-handoff" role="status">{t("login.handoff")}</p>
        ) : (
        <form className="login-form" onSubmit={handleSubmit}>
          <p role="status">{t("login.prompt")}</p>
          <label>
            <span>{t("login.email")}</span>
            <div className="field">
              <Mail size={18} />
              <input
                autoComplete="email"
                disabled={isLoading || !isConfigured}
                onChange={(event) => setEmail(event.currentTarget.value)}
                placeholder="name@company.co.il"
                required
                type="email"
                value={email}
              />
            </div>
          </label>
          <label>
            <span>{t("login.password")}</span>
            <div className="field">
              <LockKeyhole size={18} />
              <input
                autoComplete="current-password"
                disabled={isLoading || !isConfigured}
                onChange={(event) => setPassword(event.currentTarget.value)}
                placeholder={t("login.password")}
                required
                type="password"
                value={password}
              />
            </div>
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="gold-button gold-button--wide" disabled={isLoading || !isConfigured} type="submit">
            {isLoading ? t("login.submitting") : t("login.submit")}
            <ArrowLeft size={18} />
          </button>
        </form>
        )}
      </section>
    </main>
  );
}
