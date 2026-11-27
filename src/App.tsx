import { useEffect, useMemo, useState } from "react";
import { Building2, Columns3, Eye, EyeOff, FileText, ListOrdered, LogOut, Send } from "lucide-react";
import { ApartmentDrawer } from "./components/ApartmentDrawer";
import { BrandLogo } from "./components/BrandLogo";
import { CompareDialog } from "./components/CompareDialog";
import { GlassBackdrop, ProjectLogo, SectionBar, TileGrid, projectSummary, type GlassTile } from "./components/GoldViewParts";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { ShareDialog } from "./components/ShareDialog";
import { usePresentationSession, signInMessages } from "./hooks/usePresentationSession";
import { usePresentationState } from "./hooks/usePresentationState";
import { useI18n } from "./i18n/LanguageContext";
import { AllProjectsScreen } from "./screens/AllProjectsScreen";
import { ApartmentsScreen, MAX_COMPARE } from "./screens/ApartmentsScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { SharedSection, projectTiles } from "./screens/ClientShareApp";
import { PlanScreen } from "./screens/PlanScreen";
import "./gold-view.css";

export default function App() {
  const { t, dir, language } = useI18n();
  const { state, isConfigured, signIn, signOut, withToken, recordProjectOpened } = usePresentationSession();
  /** "" = the project's tiles; otherwise the open section (about, apartments, prices, plans, gallery, spec, feature-…, model3d, location). */
  const [view, setView] = useState("");
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
  const hasPlans = listedApartments.some((apartment) => apartment.planAttached && apartment.planUrl);
  const tiles: GlassTile[] = useMemo(() => {
    if (!selectedProject) return [];
    const extra: GlassTile[] = [
      ...(listedApartments.length && meeting.showPrices ? [{ id: "prices", icon: ListOrdered, title: t("section.prices"), hint: t("gv.tile.prices") }] : []),
      ...(hasPlans ? [{ id: "plans", icon: FileText, title: t("section.plans"), hint: t("gv.tile.plans") }] : []),
    ];
    return projectTiles(selectedProject, t, { count: openApartments.length, available: openApartments.filter((a) => a.status === "available").length }, extra);
  }, [hasPlans, listedApartments.length, meeting.showPrices, openApartments, selectedProject, t]);

  // A project can leave the user's scope, or a section can lose its content, while the app is open.
  useEffect(() => {
    if (view && !tiles.some((tile) => tile.id === view)) setView("");
  }, [tiles, view]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, selectedProjectId]);

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setIsSigningIn(true);
    setSignInError(null);
    const result = await signIn(email, password);
    if (!result.ok) setSignInError(result.message);
    setIsSigningIn(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setView("");
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
    setView("");
    recordProjectOpened(projectId);
  };

  if (!selectedProject) {
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

  const summary = projectSummary(selectedProject, t, language);
  const current = tiles.some((tile) => tile.id === view) ? view : "";
  const title = tiles.find((tile) => tile.id === current)?.title ?? "";

  /** Marketer controls, always at hand during the meeting. Never shown on the client page. */
  const meetingBar = (
    <nav className="gv-meeting-bar" aria-label={t("gv.meeting.tools")}>
      <button type="button" className="gv-meeting-bar__button" onClick={() => setSelectedProjectId("")}>
        <Building2 size={18} aria-hidden="true" />
        <span>{t("nav.allProjects")}</span>
      </button>
      <button
        type="button"
        className="gv-meeting-bar__button"
        onClick={meeting.togglePrices}
        aria-pressed={!meeting.showPrices}
      >
        {meeting.showPrices ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
        <span>{meeting.showPrices ? t("prices.hide") : t("prices.show")}</span>
      </button>
      {comparedApartments.length > 1 && (
        <button type="button" className="gv-meeting-bar__button" onClick={() => setIsCompareOpen(true)}>
          <Columns3 size={18} aria-hidden="true" />
          <span>{t("compare.button", { count: comparedApartments.length })}</span>
        </button>
      )}
      {selectedIds.length > 0 && (
        <button type="button" className="gv-meeting-bar__button gv-meeting-bar__button--primary" onClick={() => setIsShareOpen(true)}>
          <Send size={18} aria-hidden="true" />
          <span>
            {t("selection.summary")} ({selectedIds.length})
          </span>
        </button>
      )}
      <LanguageSwitcher />
      <button type="button" className="gv-meeting-bar__button gv-meeting-bar__button--icon" onClick={() => void handleSignOut()} aria-label={t("nav.signOut")} title={t("nav.signOut")}>
        <LogOut size={18} aria-hidden="true" />
      </button>
    </nav>
  );

  return (
    <>
      <div className="gv gv--meeting" dir={dir}>
        <GlassBackdrop image={selectedProject.heroImage} dim={Boolean(current)} />
        {notice}
        {!current ? (
          <main className="gv-home">
            <header className="gv-top">
              <ProjectLogo project={selectedProject} />
              <BrandLogo compact surface="gold" onClick={() => setSelectedProjectId("")} />
            </header>
            <div className="gv-home__body">
              <div className="gv-home__title">
                <h1 dir="auto">{selectedProject.location || selectedProject.name}</h1>
                {summary && <p dir="auto">{summary}</p>}
              </div>
              <TileGrid label={selectedProject.name} tiles={tiles} onOpen={setView} />
            </div>
          </main>
        ) : (
          <main className="gv-section-view">
            <SectionBar title={title} onBack={() => setView("")} />
            <div className="gv-section-body">
              {current === "apartments" && <ApartmentsScreen variant="available" apartments={openApartments} {...tableProps} />}
              {current === "prices" && <ApartmentsScreen variant="priceList" apartments={listedApartments} {...tableProps} />}
              {current === "plans" && (
                <PlanScreen apartments={listedApartments} initialApartmentId={planApartmentId} showPrices={meeting.showPrices} />
              )}
              {!["apartments", "prices", "plans"].includes(current) && <SharedSection id={current} project={selectedProject} />}
            </div>
          </main>
        )}
        {meetingBar}

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
      </div>
    </>
  );
}
