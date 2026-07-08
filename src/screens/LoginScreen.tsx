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
          <label>
            <span>אימייל</span>
            <div className="field">
              <Mail size={18} />
              <input
                autoComplete="email"
                disabled={isLoading}
                onChange={(event) => setEmail(event.currentTarget.value)}
                placeholder={isDemoOnly ? "מצב דמו מקומי" : "name@goldlands.co.il"}
                required={!isDemoOnly}
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
                placeholder={isDemoOnly ? "אין צורך בסיסמה במצב דמו" : "סיסמה"}
                required={!isDemoOnly}
                type="password"
                value={password}
              />
            </div>
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="gold-button gold-button--wide" disabled={isLoading} type="submit">
            {isLoading ? "מתחבר..." : isDemoOnly ? "כניסה למצב דמו" : "כניסה למערכת"}
            <ArrowLeft size={18} />
          </button>
          {!isDemoOnly && canUseDemoLogin && onDemoLogin && (
            <button
              className="ghost-button gold-button--wide"
              disabled={isLoading}
              onClick={() => void onDemoLogin()}
              type="button"
            >
              כניסה לדמו מקומי
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
