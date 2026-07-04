import { useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ProjectSectionNav, projectSectionScreens } from "./components/ProjectSectionNav";
import { readinessChecklist } from "./data/mockData";
import { useProjectsStore } from "./hooks/useProjectsStore";
import { AllProjectsScreen } from "./screens/AllProjectsScreen";
import { ApartmentsScreen } from "./screens/ApartmentsScreen";
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
import { ProjectReadinessScreen } from "./screens/ProjectReadinessScreen";
import { TechnicalSpecScreen } from "./screens/TechnicalSpecScreen";
import type { Screen } from "./types";

const screenTitles: Record<Screen, string> = {
  login: "כניסה",
  projects: "פרויקטים",
  opening: "סקירת פרויקט",
  apartments: "דירות פנויות",
  prices: "מחירון",
  gallery: "גלריית הדמיות",
  plans: "תוכנית דירה",
  technical: "מפרט טכני",
  location: "מיקום וסביבה",
  faq: "שאלות נפוצות",
  summary: "סיכום לקוח",
  readiness: "מוכנות פרויקטים",
  admin: "ניהול פרויקטים",
  projectManagement: "ניהול פרויקט",
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

export default function App() {
  const {
    projects,
    apartments,
    readinessItems,
    addProject,
    updateProject,
    deleteProject,
    updateApartment,
    resetDemoData,
  } = useProjectsStore();
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0]!,
    [projects, selectedProjectId],
  );

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

  const selectedApartment = useMemo(
    () =>
      projectApartments.find((apartment) => apartment.id === selectedApartmentId) ??
      clientFacingApartments[0] ??
      projectApartments[0],
    [clientFacingApartments, projectApartments, selectedApartmentId],
  );

  const goToProjects = () => setScreen("projects");
  const openReadiness = () => setScreen("readiness");
  const openAdmin = () => setScreen("admin");
  const openProjectManagement = (projectId: string) => {
    setSelectedProjectId(projectId);
    setScreen("projectManagement");
  };
  const selectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedApartmentId(null);
    setScreen("opening");
  };

  const openPlan = (apartmentId: string) => {
    setSelectedApartmentId(apartmentId);
    setScreen("plans");
  };

  const handleDeleteProject = (projectId: string) => {
    const nextProject = projects.find((project) => project.id !== projectId);
    deleteProject(projectId);
    if (selectedProjectId === projectId) {
      setSelectedProjectId(nextProject?.id ?? "");
      setSelectedApartmentId(null);
      setScreen(nextProject ? "admin" : "projects");
    }
  };

  const handleResetDemoData = () => {
    resetDemoData();
    setSelectedProjectId("gold-tower");
    setSelectedApartmentId(null);
    setScreen("admin");
  };

  const currentFlowIndex = flow.indexOf(screen);
  const nextScreen = currentFlowIndex >= 0 ? flow[currentFlowIndex + 1] : undefined;
  const previousScreen = currentFlowIndex > 0 ? flow[currentFlowIndex - 1] : "projects";

  if (screen === "login") {
    return <LoginScreen onLogin={goToProjects} />;
  }

  if (screen === "projects") {
    return (
      <AllProjectsScreen
        projects={projects}
        onSelect={selectProject}
        onReadiness={openReadiness}
        onAdmin={openAdmin}
      />
    );
  }

  if (screen === "readiness") {
    return (
      <ProjectReadinessScreen
        projects={projects}
        readinessItems={readinessItems}
        checklistCount={readinessChecklist.length}
        onProjects={goToProjects}
        onAdmin={openAdmin}
        onOpenProject={openProjectManagement}
      />
    );
  }

  if (screen === "admin") {
    return (
      <ProjectManagementScreen
        projects={projects}
        readinessItems={readinessItems}
        onProjects={goToProjects}
        onReadiness={openReadiness}
        onOpenProject={selectProject}
        onEditProject={openProjectManagement}
        onAddProject={addProject}
        onDeleteProject={handleDeleteProject}
        onResetDemoData={handleResetDemoData}
      />
    );
  }

  if (screen === "projectManagement") {
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
      />
    );
  }

  return (
    <AppShell
      project={selectedProject}
      title={screenTitles[screen]}
      eyebrow={selectedProject.name}
      onProjects={goToProjects}
      onReadiness={openReadiness}
      onAdmin={openAdmin}
      onBack={() => setScreen(previousScreen)}
      onNext={nextScreen ? () => setScreen(nextScreen) : undefined}
      nextLabel={nextScreen ? screenTitles[nextScreen] : "סיום"}
    >
      {projectSectionScreens.includes(screen) && (
        <ProjectSectionNav active={screen} onNavigate={(target) => setScreen(target)} />
      )}
      {screen === "opening" && <ProjectOpeningScreen project={selectedProject} />}
      {screen === "apartments" && (
        <ApartmentsScreen apartments={clientFacingApartments} onOpenPlan={openPlan} />
      )}
      {screen === "prices" && <PriceListScreen apartments={projectApartments} />}
      {screen === "gallery" && <GalleryScreen project={selectedProject} />}
      {screen === "plans" && <PlanScreen apartment={selectedApartment} />}
      {screen === "technical" && <TechnicalSpecScreen />}
      {screen === "location" && <LocationScreen project={selectedProject} />}
      {screen === "faq" && <FAQScreen />}
      {screen === "summary" && (
        <ClientSummaryScreen project={selectedProject} apartment={selectedApartment} />
      )}
    </AppShell>
  );
}
