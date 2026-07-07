import { useState, type FormEvent } from "react";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";

interface LoginScreenProps {
  backgroundImage?: string;
  onLogin: (credentials: { email: string; password: string }) => void | Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  isDemoMode?: boolean;
}

export function LoginScreen({
  backgroundImage,
  onLogin,
  isLoading = false,
  error,
  isDemoMode = false,
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
                placeholder={isDemoMode ? "מצב דמו מקומי" : "name@goldlands.co.il"}
                required={!isDemoMode}
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
                placeholder={isDemoMode ? "אין צורך בסיסמה במצב דמו" : "סיסמה"}
                required={!isDemoMode}
                type="password"
                value={password}
              />
            </div>
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="gold-button gold-button--wide" disabled={isLoading} type="submit">
            {isLoading ? "מתחבר..." : isDemoMode ? "כניסה למצב דמו" : "כניסה למערכת"}
            <ArrowLeft size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
