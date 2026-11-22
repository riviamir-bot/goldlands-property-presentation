import { useState, type FormEvent } from "react";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";

interface LoginScreenProps {
  onLogin: (credentials: { email: string; password: string }) => void | Promise<void>;
  isLoading?: boolean;
  isConfigured?: boolean;
  error?: string | null;
}

export function LoginScreen({ onLogin, isLoading = false, isConfigured = true, error }: LoginScreenProps) {
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
      <section className="login-panel" aria-label="כניסה למערכת">
        <BrandLogo />
        <form className="login-form" onSubmit={handleSubmit}>
          <p role="status">הכניסה עם שם המשתמש והסיסמה של מערכת השיווק.</p>
          <label>
            <span>אימייל</span>
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
            <span>סיסמה</span>
            <div className="field">
              <LockKeyhole size={18} />
              <input
                autoComplete="current-password"
                disabled={isLoading || !isConfigured}
                onChange={(event) => setPassword(event.currentTarget.value)}
                placeholder="סיסמה"
                required
                type="password"
                value={password}
              />
            </div>
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="gold-button gold-button--wide" disabled={isLoading || !isConfigured} type="submit">
            {isLoading ? "מתחבר..." : "כניסה"}
            <ArrowLeft size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
