import type { CurrentUser, Screen } from "../types";

export const demoCurrentUser: CurrentUser = {
  id: "mock-admin",
  name: "משתמש דמו",
  role: "admin",
  email: "demo@goldlands.local",
};

const presentationAllowedScreens = new Set<Screen>([
  "login",
  "projects",
  "opening",
  "apartments",
  "prices",
  "gallery",
  "plans",
  "technical",
  "location",
  "clientPreview",
]);

export function canManageProjects(user?: CurrentUser | null) {
  return user?.role === "admin";
}

export function canViewProjectReadiness(user?: CurrentUser | null) {
  return user?.role === "admin";
}

export function canAccessScreen(user: CurrentUser | null | undefined, screen: Screen) {
  if (screen === "login") return true;
  if (!user) return false;
  if (user.role === "admin") return true;

  return presentationAllowedScreens.has(screen);
}
