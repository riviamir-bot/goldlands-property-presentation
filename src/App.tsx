import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ClientShareModal, MOCK_CLIENT_VIEW_URL } from "./components/ClientShareModal";
import { ProjectSectionNav, projectSectionScreens } from "./components/ProjectSectionNav";
import {
  canAccessScreen,
  canManageProjects,
  canViewProjectReadiness,
} from "./data/mockCurrentUser";
import { useAuthProfile } from "./hooks/useAuthProfile";
import { useProjectsStore } from "./hooks/useProjectsStore";
import { AllProjectsScreen } from "./screens/AllProjectsScreen";
import { ApartmentsScreen } from "./screens/ApartmentsScreen";
import { ClientPreviewScreen } from "./screens/ClientPreviewScreen";
import { ClientSummaryScreen } from "./screens/ClientSummaryScreen";
import { FAQScreen } from "./screens/FAQScreen";
import { GalleryScreen } from "./screens/GalleryScreen";
import { LocationScreen } from "./screens/LocationScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { PlanScreen } from "./screens/PlanScreen";
import { PriceListScreen } from "./screens/PriceListScreen";
import { ProjectOpeningScreen } from "./screens/ProjectOpeningScreen";
import { ProjectManagementDetailScreen } from "./screens/ProjectManagementDetailScreen";
import { ProjectManagementScreen } from "./screens/ProjectManagementScreen";
import { ProjectImportScreen } from "./screens/ProjectImportScreen";
import { ProjectReadinessScreen } from "./screens/ProjectReadinessScreen";
import { TechnicalSpecScreen } from "./screens/TechnicalSpecScreen";
import type { Apartment, ClientShareConfig, Screen } from "./types";
import { getValidProjectMainImage } from "./utils/projectImages";

const screenTitles: Record<Screen, string> = {
  login: "כניסה",
  projects: "פרויקטים",
  opening: "תצוגת פרויקט",
  apartments: "דירות פנויות",
  prices: "מחירון",
  gallery: "גלריית הדמיות",
  plans: "תוכנית דירה",
  technical: "מפרט טכני",
  location: "מיקום וסביבה",
  faq: "שאלות נפוצות",
  summary: "סיכום לקוח",
  clientPreview: "תצוגת לקוח",
  readiness: "חוסרים / מוכנות פרויקטים",
  admin: "ניהול פרויקטים",
  projectManagement: "ניהול פרויקט",
  importProject: "ייבוא מסמכי פרויקט",
};

const flow: Screen[] = [
  "opening",
  "apartments",
  "prices",
  "gallery",
  "plans",
  "technical",
  "location",
];

const authRoleLabels = {
  admin: "Admin",
  sales: "Sales",
  viewer: "Viewer",
};

function makeDefaultShareConfig(availableApartments: Apartment[]): ClientShareConfig {
  const apartment = availableApartments[0];

  return {
    sections: {
      overview: true,
      gallery: true,
      plans: true,
      technical: true,
      location: true,
      apartments: true,
      prices: true,
    },
    selectedApartments: apartment
      ? [{ apartmentId: apartment.id, includePlan: apartment.planAttached }]
      : [],
    showPrice: true,
    expiresIn: "7d",
    url: MOCK_CLIENT_VIEW_URL,
  };
}

export default function App() {
  const {
    currentUser,
    isLoading: isAuthLoading,
    error: authError,
    authMode,
    hasSupabaseSession,
    isSupabaseConfigured,
    signIn,
    signInDemo,
    signOut,
  } = useAuthProfile();
  const {
    projects,
    apartments,
    readinessItems,
    readinessChecklistCount,
    addProject,
    updateProject,
    deleteProject,
    reorderProjects,
    updateApartment,
    importProjectBundle,
    updateProjectFileType,
    deleteProjectFile,
    migrateLocalStateToSupabase,
    resetDemoData,
    isSupabaseSourceActive,
  } = useProjectsStore({
    canUseSupabase: Boolean(currentUser && authMode === "supabase" && hasSupabaseSession),
    supabaseRetryKey: currentUser?.id ?? "anonymous",
  });
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  const [isClientShareOpen, setIsClientShareOpen] = useState(false);
  const [clientShareConfig, setClientShareConfig] = useState<ClientShareConfig | null>(null);
  const userCanManageProjects = canManageProjects(currentUser);
  const userCanViewReadiness = canViewProjectReadiness(currentUser);
  const userHasRealSupabaseAdmin =
    currentUser?.role === "admin" && authMode === "supabase" && hasSupabaseSession;
  const authModeLabel =
    authMode === "demo" && currentUser
      ? "Demo Admin"
      : authMode === "supabase" && currentUser
        ? `Supabase ${authRoleLabels[currentUser.role]}`
        : "";

  const handleLogin = async (credentials: { email: string; password: string }) => {
    const didLogin = await signIn(credentials);

    if (didLogin) {
      setScreen("projects");
    }
  };

  const handleDemoLogin = async () => {
    const didLogin = await signInDemo();

    if (didLogin) {
      setScreen("projects");
    }
  };

  const handleSignOut = async () => {
    const didSignOut = await signOut();

    if (!didSignOut) return;

    setIsClientShareOpen(false);
    setClientShareConfig(null);
    setSelectedApartmentId(null);
    setScreen("login");
  };

  useEffect(() => {
    if (!currentUser && screen !== "login") {
      setScreen("login");
      return;
    }

    if (currentUser && screen === "login" && !isAuthLoading) {
      setScreen("projects");
      return;
    }

    if (currentUser && !canAccessScreen(currentUser, screen)) {
      setScreen("projects");
    }
  }, [currentUser, isAuthLoading, screen]);

  useEffect(() => {
    if (!projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0]?.id ?? "");
      setSelectedApartmentId(null);
      setClientShareConfig(null);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0]!,
    [projects, selectedProjectId],
  );
  const userCanUploadProjectFiles =
    userHasRealSupabaseAdmin && isSupabaseSourceActive && selectedProject.isSupabaseBacked === true;
  const uploadUnavailableMessage = userHasRealSupabaseAdmin
    ? "יש לשמור את הפרויקט בענן לפני העלאת קבצים."
    : "Upload requires real Supabase admin login.";

  useEffect(() => {
    console.info("[GOLDLANDS] Runtime auth mode", {
      authMode,
      profileRole: currentUser?.role ?? null,
      hasSupabaseSession,
      isSupabaseSourceActive,
      selectedProjectId: selectedProject.id,
      selectedProjectIsSupabaseBacked: selectedProject.isSupabaseBacked === true,
      canUploadProjectFiles: userCanUploadProjectFiles,
    });
  }, [
    authMode,
    currentUser?.role,
    hasSupabaseSession,
    isSupabaseSourceActive,
    selectedProject.id,
    selectedProject.isSupabaseBacked,
    userCanUploadProjectFiles,
  ]);

  const projectApartments = useMemo(
    () => apartments.filter((apartment) => apartment.projectId === selectedProject.id),
    [apartments, selectedProject.id],
  );

  const clientFacingApartments = useMemo(
    () =>
      projectApartments.filter((apartment) =>
        ["available", "option", "reserved"].includes(apartment.status),
      ),
    [projectApartments],
  );

  const availableApartments = useMemo(
    () => projectApartments.filter((apartment) => apartment.status === "available"),
    [projectApartments],
  );

  const selectedApartment = useMemo(
    () =>
      projectApartments.find((apartment) => apartment.id === selectedApartmentId) ??
      clientFacingApartments[0] ??
      projectApartments[0],
    [clientFacingApartments, projectApartments, selectedApartmentId],
  );

  const goToProjects = () => setScreen("projects");
  const openReadiness = () => {
    if (userCanViewReadiness) setScreen("readiness");
  };
  const openAdmin = () => {
    if (userCanManageProjects) setScreen("admin");
  };
  const openProjectImport = () => {
    if (userCanManageProjects) setScreen("importProject");
  };

  const openProjectManagement = (projectId: string) => {
    if (!userCanManageProjects) {
      selectProject(projectId);
      return;
    }

    setSelectedProjectId(projectId);
    setScreen("projectManagement");
  };
  const selectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedApartmentId(null);
    setClientShareConfig(null);
    setScreen("opening");
  };

  const openPlan = (apartmentId: string) => {
    setSelectedApartmentId(apartmentId);
    setScreen("plans");
  };

  const handleDeleteProject = (projectId: string) => {
    if (!userCanManageProjects) return;

    const nextProject = projects.find((project) => project.id !== projectId);
    deleteProject(projectId);
    if (selectedProjectId === projectId) {
      setSelectedProjectId(nextProject?.id ?? "");
      setSelectedApartmentId(null);
      setScreen(nextProject ? "admin" : "projects");
    }
  };

  const handleReorderProjects = async (projectIds: string[]) => {
    await reorderProjects(projectIds);
  };

  const handleResetDemoData = () => {
    if (!userCanManageProjects) return;

    resetDemoData();
    setSelectedProjectId("gold-tower");
    setSelectedApartmentId(null);
    setScreen("admin");
  };

  const openClientShare = () => {
    setIsClientShareOpen(true);
  };

  const openClientPreview = (config: ClientShareConfig) => {
    setClientShareConfig(config);
    setIsClientShareOpen(false);
    setScreen("clientPreview");
  };

  const clearSelectedProjectMainImage = () => {
    updateProject(selectedProject.id, {
      mainImage: "",
      mainImagePath: undefined,
    });
  };

  const currentFlowIndex = flow.indexOf(screen);
  const nextScreen = currentFlowIndex >= 0 ? flow[currentFlowIndex + 1] : undefined;
  const previousScreen = currentFlowIndex > 0 ? flow[currentFlowIndex - 1] : "projects";

  if (!currentUser || screen === "login") {
    return (
      <LoginScreen
        backgroundImage={projects[0] ? getValidProjectMainImage(projects[0]) : ""}
        error={authError}
        isDemoOnly={!isSupabaseConfigured}
        isLoading={isAuthLoading}
        canUseDemoLogin={isSupabaseConfigured}
        onLogin={handleLogin}
        onDemoLogin={handleDemoLogin}
      />
    );
  }

  if (!canAccessScreen(currentUser, screen)) {
    return (
      <AllProjectsScreen
        projects={projects}
        onSelect={selectProject}
        onReorderProjects={handleReorderProjects}
        onReadiness={openReadiness}
        onAdmin={openAdmin}
        canViewReadiness={userCanViewReadiness}
        canManageProjects={userCanManageProjects}
        authModeLabel={authModeLabel}
        onSignOut={handleSignOut}
      />
    );
  }

  if (screen === "projects") {
    return (
      <AllProjectsScreen
        projects={projects}
        onSelect={selectProject}
        onReorderProjects={handleReorderProjects}
        onReadiness={openReadiness}
        onAdmin={openAdmin}
        canViewReadiness={userCanViewReadiness}
        canManageProjects={userCanManageProjects}
        authModeLabel={authModeLabel}
        onSignOut={handleSignOut}
      />
    );
  }

  if (screen === "readiness" && userCanViewReadiness) {
    return (
      <ProjectReadinessScreen
        projects={projects}
        readinessItems={readinessItems}
        checklistCount={readinessChecklistCount}
        onProjects={goToProjects}
        onAdmin={openAdmin}
        onOpenProject={openProjectManagement}
        canViewReadiness={userCanViewReadiness}
        canManageProjects={userCanManageProjects}
        authModeLabel={authModeLabel}
        onSignOut={handleSignOut}
      />
    );
  }

  if (screen === "admin" && userCanManageProjects) {
    return (
      <ProjectManagementScreen
        projects={projects}
        apartments={apartments}
        readinessItems={readinessItems}
        onProjects={goToProjects}
        onReadiness={openReadiness}
        onOpenProject={selectProject}
        onEditProject={openProjectManagement}
        onAddProject={addProject}
        onDeleteProject={handleDeleteProject}
        onResetDemoData={handleResetDemoData}
        onImportProject={openProjectImport}
        onMigrateLocalToSupabase={migrateLocalStateToSupabase}
        canMigrateLocalToSupabase={userHasRealSupabaseAdmin}
        isSupabaseSourceActive={isSupabaseSourceActive}
        canViewReadiness={userCanViewReadiness}
        canManageProjects={userCanManageProjects}
        authModeLabel={authModeLabel}
        onSignOut={handleSignOut}
      />
    );
  }


  if (screen === "importProject" && userCanManageProjects) {
    return (
      <ProjectImportScreen
        projects={projects}
        apartments={apartments}
        readinessItems={readinessItems}
        onProjects={goToProjects}
        onReadiness={openReadiness}
        onAdmin={openAdmin}
        onImport={importProjectBundle}
        onOpenProject={openProjectManagement}
        canViewReadiness={userCanViewReadiness}
        canManageProjects={userCanManageProjects}
        authModeLabel={authModeLabel}
        onSignOut={handleSignOut}
      />
    );
  }

  if (screen === "projectManagement" && userCanManageProjects) {
    return (
      <ProjectManagementDetailScreen
        project={selectedProject}
        apartments={projectApartments}
        readiness={readinessItems.find((item) => item.projectId === selectedProject.id)}
        onProjects={goToProjects}
        onReadiness={openReadiness}
        onAdmin={openAdmin}
        onOpenProject={selectProject}
        onUpdateProject={updateProject}
        onUpdateApartment={updateApartment}
        onUpdateProjectFileType={updateProjectFileType}
        onDeleteProjectFile={deleteProjectFile}
        canViewReadiness={userCanViewReadiness}
        canManageProjects={userCanManageProjects}
        canUploadProjectFiles={userCanUploadProjectFiles}
        uploadUnavailableMessage={uploadUnavailableMessage}
        authModeLabel={authModeLabel}
        onSignOut={handleSignOut}
      />
    );
  }

  if (screen === "clientPreview") {
    return (
      <ClientPreviewScreen
        project={selectedProject}
        apartments={projectApartments}
        shareConfig={clientShareConfig ?? makeDefaultShareConfig(availableApartments)}
        onBack={() => setScreen("opening")}
        authModeLabel={authModeLabel}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <>
      <AppShell
        project={selectedProject}
        title={screenTitles[screen]}
        eyebrow={selectedProject.name}
        onProjects={goToProjects}
        onReadiness={openReadiness}
        onAdmin={openAdmin}
        canViewReadiness={userCanViewReadiness}
        canManageProjects={userCanManageProjects}
        authModeLabel={authModeLabel}
        onSignOut={handleSignOut}
        onClientShare={projectSectionScreens.includes(screen) ? openClientShare : undefined}
        onBack={() => setScreen(previousScreen)}
        onNext={nextScreen ? () => setScreen(nextScreen) : undefined}
        nextLabel={nextScreen ? screenTitles[nextScreen] : "סיום"}
      >
        {projectSectionScreens.includes(screen) && (
          <ProjectSectionNav active={screen} onNavigate={(target) => setScreen(target)} />
        )}
        {screen === "opening" && (
          <ProjectOpeningScreen
            project={selectedProject}
            onClearMainImage={clearSelectedProjectMainImage}
          />
        )}
        {screen === "apartments" && (
          <ApartmentsScreen apartments={clientFacingApartments} onOpenPlan={openPlan} />
        )}
        {screen === "prices" && <PriceListScreen apartments={projectApartments} />}
        {screen === "gallery" && <GalleryScreen project={selectedProject} />}
        {screen === "plans" && <PlanScreen apartment={selectedApartment} />}
        {screen === "technical" && <TechnicalSpecScreen project={selectedProject} />}
        {screen === "location" && <LocationScreen project={selectedProject} />}
        {screen === "faq" && <FAQScreen />}
        {screen === "summary" && (
          <ClientSummaryScreen project={selectedProject} apartment={selectedApartment} />
        )}
      </AppShell>
      {isClientShareOpen && (
        <ClientShareModal
          project={selectedProject}
          availableApartments={availableApartments}
          onClose={() => setIsClientShareOpen(false)}
          onOpenPreview={openClientPreview}
        />
      )}
    </>
  );
}
