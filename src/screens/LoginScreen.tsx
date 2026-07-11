import { useState, type FormEvent } from "react";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";

interface LoginScreenProps {
  backgroundImage?: string;
  onLogin: (credentials: { email: string; password: string }) => void | Promise<void>;
  onDemoLogin?: () => void | Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  isDemoOnly?: boolean;
  canUseDemoLogin?: boolean;
}

export function LoginScreen({
  backgroundImage,
  onLogin,
  onDemoLogin,
  isLoading = false,
  error,
  isDemoOnly = false,
  canUseDemoLogin = false,
}: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDemoOnly) return;
    void onLogin({ email, password });
  };

  return (
    <main className="login-screen">
      <div
        className="login-screen__image"
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
      />
      <section className="login-panel" aria-label="כניסה למערכת">
        <BrandLogo />
        <form className="login-form" onSubmit={handleSubmit}>
          {isDemoOnly ? (
            <p role="status">Supabase אינו מוגדר. המערכת עובדת מקומית במצב דמו בלבד.</p>
          ) : (
            <>
              <p role="status">התחברות עם משתמש Supabase admin פעיל.</p>
              <label>
                <span>אימייל</span>
                <div className="field">
                  <Mail size={18} />
                  <input
                    autoComplete="email"
                    disabled={isLoading}
                    onChange={(event) => setEmail(event.currentTarget.value)}
                    placeholder="name@goldlands.co.il"
                    required
                    type="email"
                    value={email}
                  />
                </div>
              </label>
              <label>
                <span>סיסמה</span>
                <div className="field">
                  <LockKeyhole size={18} />
                  <input
                    autoComplete="current-password"
                    disabled={isLoading}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    placeholder="סיסמה"
                    required
                    type="password"
                    value={password}
                  />
                </div>
              </label>
            </>
          )}
          {error && <p role="alert">{error}</p>}
          {!isDemoOnly && (
            <button className="gold-button gold-button--wide" disabled={isLoading} type="submit">
              {isLoading ? "מתחבר..." : "כניסה"}
              <ArrowLeft size={18} />
            </button>
          )}
          {((isDemoOnly && onDemoLogin) || (!isDemoOnly && canUseDemoLogin && onDemoLogin)) && (
            <button
              className={isDemoOnly ? "gold-button gold-button--wide" : "ghost-button gold-button--wide"}
              disabled={isLoading}
              onClick={() => void onDemoLogin?.()}
              type="button"
            >
              כניסה למצב דמו
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
