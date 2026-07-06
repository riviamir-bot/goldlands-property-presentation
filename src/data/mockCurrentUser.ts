import type { CurrentUser, Screen } from "../types";

export const currentUser: CurrentUser = {
  id: "mock-admin",
  name: "משתמש דמו",
  role: "admin",
};

const salesAllowedScreens = new Set<Screen>([
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

export function canManageProjects(user: CurrentUser) {
  return user.role === "admin";
}

export function canViewProjectReadiness(user: CurrentUser) {
  return user.role === "admin";
}

export function canAccessScreen(user: CurrentUser, screen: Screen) {
  if (user.role === "admin") return true;

  return salesAllowedScreens.has(screen);
}
