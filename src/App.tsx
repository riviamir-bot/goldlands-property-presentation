import { useEffect, useMemo, useState } from "react";
import { Columns3, Eye, EyeOff, Send } from "lucide-react";
import { ApartmentDrawer } from "./components/ApartmentDrawer";
import { AppShell } from "./components/AppShell";
import { CompareDialog } from "./components/CompareDialog";
import { ProjectSectionNav } from "./components/ProjectSectionNav";
import { ShareDialog } from "./components/ShareDialog";
import { usePresentationSession, signInMessages } from "./hooks/usePresentationSession";
import { usePresentationState } from "./hooks/usePresentationState";
import { useI18n } from "./i18n/LanguageContext";
import { AllProjectsScreen } from "./screens/AllProjectsScreen";
import { ApartmentsScreen, MAX_COMPARE } from "./screens/ApartmentsScreen";
import { GalleryScreen } from "./screens/GalleryScreen";
import { LocationScreen } from "./screens/LocationScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { Model3dScreen } from "./screens/Model3dScreen";
import { PlanScreen } from "./screens/PlanScreen";
import { ProjectOpeningScreen } from "./screens/ProjectOpeningScreen";
import { TechnicalSpecScreen } from "./screens/TechnicalSpecScreen";
import type { Screen } from "./types";
import { visibleSections } from "./utils/sections";

type ProjectScreen = Exclude<Screen, "login" | "projects">;

export default function App() {
  const { t } = useI18n();
  const { state, isConfigured, signIn, signOut, withToken, recordProjectOpened } = usePresentationSession();
  const [screen, setScreen] = useState<Screen>("projects");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [planApartmentId, setPlanApartmentId] = useState<string | null>(null);
  const [openApartmentId, setOpenApartmentId] = useState<string | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const meeting = usePresentationState(selectedProjectId);

  const projects = state.payload?.projects ?? [];
  const apartments = state.payload?.apartments ?? [];
  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId), [projects, selectedProjectId]);
  const listedApartments = useMemo(
    () => apartments.filter((apartment) => apartment.projectId === selectedProjectId && apartment.status !== "notMarketing"),
    [apartments, selectedProjectId],
  );
  const openApartments = useMemo(() => listedApartments.filter((apartment) => apartment.status !== "sold"), [listedApartments]);
  const sections = useMemo(
    () => (selectedProject ? visibleSections(selectedProject, listedApartments, { showPrices: meeting.showPrices }) : []),
    [listedApartments, meeting.showPrices, selectedProject],
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
  };

  if (state.phase === "loading") {
    return (
      <main className="app-loading-screen">
        <strong>GOLDLANDS</strong>
        <span>{t("app.loading")}</span>
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
      <span>{t("session.reconnectNotice")}</span>
      <button className="mini-button" onClick={() => void handleSignOut()} type="button">
        {t("session.reconnect")}
      </button>
    </div>
  ) : state.error ? (
    <div className="session-notice" role="status">
      <span>{state.error}</span>
    </div>
  ) : null;

  const selectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setPlanApartmentId(null);
    setOpenApartmentId(null);
    setScreen("opening");
    recordProjectOpened(projectId);
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

  const projectScreen = screen as ProjectScreen;
  const sectionIndex = sections.indexOf(projectScreen);
  const nextScreen = sectionIndex >= 0 ? sections[sectionIndex + 1] : undefined;
  const previousScreen = sectionIndex > 0 ? sections[sectionIndex - 1] : "projects";
  const openApartment = listedApartments.find((apartment) => apartment.id === openApartmentId);
  const comparedApartments = meeting.compare
    .map((id) => listedApartments.find((apartment) => apartment.id === id))
    .filter((apartment): apartment is NonNullable<typeof apartment> => Boolean(apartment));
  const selectedIds = openApartments.filter((apartment) => meeting.selection.has(apartment.id)).map((apartment) => apartment.id);

  const tableProps = {
    showPrices: meeting.showPrices,
    selection: meeting.selection,
    compare: meeting.compare,
    onOpenApartment: setOpenApartmentId,
    onToggleSelection: meeting.toggleSelection,
    onToggleCompare: meeting.toggleCompare,
  };

  const actions = (
    <>
      {comparedApartments.length > 1 && (
        <button className="ghost-button ghost-button--compact" type="button" onClick={() => setIsCompareOpen(true)}>
          <Columns3 size={16} />
          {t("compare.button", { count: comparedApartments.length })}
        </button>
      )}
      {selectedIds.length > 0 && (
        <button className="gold-button gold-button--compact" type="button" onClick={() => setIsShareOpen(true)} title={t("selection.count", { count: selectedIds.length })}>
          <Send size={16} />
          {t("selection.summary")} ({selectedIds.length})
        </button>
      )}
      <button
        className="icon-button"
        type="button"
        onClick={meeting.togglePrices}
        aria-pressed={!meeting.showPrices}
        aria-label={meeting.showPrices ? t("prices.hide") : t("prices.show")}
        title={meeting.showPrices ? t("prices.hide") : t("prices.show")}
      >
        {meeting.showPrices ? <Eye size={19} /> : <EyeOff size={19} />}
      </button>
    </>
  );

  return (
    <>
      <AppShell
        project={selectedProject}
        title={t(`section.${projectScreen}`)}
        eyebrow={selectedProject.name}
        notice={notice}
        actions={actions}
        onProjects={() => setScreen("projects")}
        onSignOut={() => void handleSignOut()}
        onBack={() => setScreen(previousScreen)}
        onNext={nextScreen ? () => setScreen(nextScreen) : undefined}
        nextLabel={nextScreen ? t(`section.${nextScreen as ProjectScreen}`) : t("nav.finish")}
      >
        <ProjectSectionNav active={screen} visible={sections} onNavigate={setScreen} />
        {screen === "opening" && <ProjectOpeningScreen project={selectedProject} />}
        {screen === "apartments" && <ApartmentsScreen variant="available" apartments={openApartments} {...tableProps} />}
        {screen === "prices" && <ApartmentsScreen variant="priceList" apartments={listedApartments} {...tableProps} />}
        {screen === "gallery" && <GalleryScreen project={selectedProject} />}
        {screen === "plans" && <PlanScreen apartments={listedApartments} initialApartmentId={planApartmentId} showPrices={meeting.showPrices} />}
        {screen === "technical" && <TechnicalSpecScreen project={selectedProject} />}
        {screen === "model3d" && <Model3dScreen project={selectedProject} />}
        {screen === "location" && <LocationScreen project={selectedProject} />}
      </AppShell>

      {openApartment && (
        <ApartmentDrawer
          apartment={openApartment}
          showPrices={meeting.showPrices}
          isSelected={meeting.selection.has(openApartment.id)}
          isCompared={meeting.compare.includes(openApartment.id)}
          canCompareMore={meeting.compare.length < MAX_COMPARE}
          onToggleSelection={() => meeting.toggleSelection(openApartment.id)}
          onToggleCompare={() => meeting.toggleCompare(openApartment.id)}
          onClose={() => setOpenApartmentId(null)}
        />
      )}

      {isCompareOpen && comparedApartments.length > 1 && (
        <CompareDialog
          apartments={comparedApartments}
          showPrices={meeting.showPrices}
          onClear={() => {
            meeting.clearCompare();
            setIsCompareOpen(false);
          }}
          onClose={() => setIsCompareOpen(false)}
        />
      )}

      {isShareOpen && selectedIds.length > 0 && (
        <ShareDialog
          project={selectedProject}
          apartments={openApartments.filter((apartment) => meeting.selection.has(apartment.id))}
          defaultShowPrices={meeting.showPrices}
          withToken={withToken}
          onClose={() => setIsShareOpen(false)}
        />
      )}
    </>
  );
}
