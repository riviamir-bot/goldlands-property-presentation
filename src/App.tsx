import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ProjectSectionNav } from "./components/ProjectSectionNav";
import { usePresentationSession, signInMessages } from "./hooks/usePresentationSession";
import { AllProjectsScreen } from "./screens/AllProjectsScreen";
import { ApartmentsScreen } from "./screens/ApartmentsScreen";
import { GalleryScreen } from "./screens/GalleryScreen";
import { LocationScreen } from "./screens/LocationScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { PlanScreen } from "./screens/PlanScreen";
import { PriceListScreen } from "./screens/PriceListScreen";
import { ProjectOpeningScreen } from "./screens/ProjectOpeningScreen";
import { TechnicalSpecScreen } from "./screens/TechnicalSpecScreen";
import type { Screen } from "./types";
import { visibleSections } from "./utils/sections";

const screenTitles: Record<Screen, string> = {
  login: "כניסה",
  projects: "פרויקטים",
  opening: "תצוגת פרויקט",
  apartments: "דירות פנויות",
  prices: "מחירון",
  gallery: "הדמיות",
  plans: "תוכנית דירה",
  technical: "מפרט טכני",
  location: "מיקום וסביבה",
};

export default function App() {
  const { state, isConfigured, signIn, signOut } = usePresentationSession();
  const [screen, setScreen] = useState<Screen>("projects");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const projects = state.payload?.projects ?? [];
  const apartments = state.payload?.apartments ?? [];
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );
  const projectApartments = useMemo(
    () => apartments.filter((apartment) => apartment.projectId === selectedProjectId),
    [apartments, selectedProjectId],
  );
  const listedApartments = useMemo(
    () => projectApartments.filter((apartment) => apartment.status !== "notMarketing"),
    [projectApartments],
  );
  const openApartments = useMemo(
    () => listedApartments.filter((apartment) => apartment.status !== "sold"),
    [listedApartments],
  );
  const sections = useMemo(
    () => (selectedProject ? visibleSections(selectedProject, listedApartments) : []),
    [selectedProject, listedApartments],
  );

  // A project can leave the user's scope, or a section can lose its content, while the app is open.
  useEffect(() => {
    if (screen === "projects") return;
    if (!selectedProject) setScreen("projects");
    else if (!sections.includes(screen)) setScreen("opening");
  }, [screen, sections, selectedProject]);

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setIsSigningIn(true);
    setSignInError(null);
    const result = await signIn(email, password);
    if (!result.ok) setSignInError(result.message);
    setIsSigningIn(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setScreen("projects");
    setSelectedProjectId("");
    setSelectedApartmentId(null);
  };

  if (state.phase === "loading") {
    return (
      <main className="app-loading-screen" dir="rtl">
        <strong>GOLDLANDS</strong>
        <span>טוען פרויקטים...</span>
      </main>
    );
  }

  if (!state.payload) {
    const error = !isConfigured
      ? signInMessages.notConfigured
      : state.phase === "forbidden"
        ? signInMessages.forbidden
        : (signInError ?? state.error);

    return <LoginScreen error={error} isConfigured={isConfigured} isLoading={isSigningIn} onLogin={handleLogin} />;
  }

  const notice = state.needsReconnect ? (
    <div className="session-notice" role="status">
      <span>נדרש חיבור מחדש כדי לקבל עדכונים. הנתונים המוצגים הם מהטעינה האחרונה.</span>
      <button className="mini-button" onClick={() => void handleSignOut()} type="button">
        התחברות מחדש
      </button>
    </div>
  ) : state.error ? (
    <div className="session-notice" role="status">
      <span>{state.error}</span>
    </div>
  ) : null;

  const goToProjects = () => setScreen("projects");
  const selectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedApartmentId(null);
    setScreen("opening");
  };

  if (screen === "projects" || !selectedProject) {
    return (
      <AllProjectsScreen
        projects={projects}
        userName={state.payload.user.name}
        notice={notice}
        onSelect={selectProject}
        onSignOut={() => void handleSignOut()}
      />
    );
  }

  const sectionIndex = sections.indexOf(screen);
  const nextScreen = sectionIndex >= 0 ? sections[sectionIndex + 1] : undefined;
  const previousScreen = sectionIndex > 0 ? sections[sectionIndex - 1] : "projects";
  const selectedApartment =
    projectApartments.find((apartment) => apartment.id === selectedApartmentId) ??
    projectApartments.find((apartment) => apartment.planAttached);

  return (
    <AppShell
      project={selectedProject}
      title={screenTitles[screen]}
      eyebrow={selectedProject.name}
      notice={notice}
      onProjects={goToProjects}
      onSignOut={() => void handleSignOut()}
      onBack={() => setScreen(previousScreen)}
      onNext={nextScreen ? () => setScreen(nextScreen) : undefined}
      nextLabel={nextScreen ? screenTitles[nextScreen] : "סיום"}
    >
      <ProjectSectionNav active={screen} visible={sections} onNavigate={setScreen} />
      {screen === "opening" && <ProjectOpeningScreen project={selectedProject} />}
      {screen === "apartments" && (
        <ApartmentsScreen
          apartments={openApartments}
          onOpenPlan={(apartmentId) => {
            setSelectedApartmentId(apartmentId);
            setScreen("plans");
          }}
        />
      )}
      {screen === "prices" && <PriceListScreen apartments={listedApartments} />}
      {screen === "gallery" && <GalleryScreen project={selectedProject} />}
      {screen === "plans" && <PlanScreen apartment={selectedApartment} project={selectedProject} />}
      {screen === "technical" && <TechnicalSpecScreen project={selectedProject} />}
      {screen === "location" && <LocationScreen project={selectedProject} />}
    </AppShell>
  );
}
