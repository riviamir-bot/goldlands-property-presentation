import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";

interface LoginScreenProps {
  backgroundImage?: string;
  onLogin: () => void;
}

export function LoginScreen({ backgroundImage, onLogin }: LoginScreenProps) {
  return (
    <main className="login-screen">
      <div
        className="login-screen__image"
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
      />
      <section className="login-panel" aria-label="כניסה למערכת">
        <BrandLogo />
        <form className="login-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            <span>אימייל</span>
            <div className="field">
              <Mail size={18} />
              <input type="email" value="sales@goldlands.co.il" readOnly />
            </div>
          </label>
          <label>
            <span>סיסמה</span>
            <div className="field">
              <LockKeyhole size={18} />
              <input type="password" value="goldlands" readOnly />
            </div>
          </label>
          <button className="gold-button gold-button--wide" type="button" onClick={onLogin}>
            כניסה למערכת
            <ArrowLeft size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
