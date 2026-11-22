# Live Connection and Sign-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The presentation shows the real GOLDLANDS projects, renders, apartments and prices read live from the marketing dashboard database, to users signed in with their marketing-system account and scoped to their assigned projects; demo mode and fictional data are gone.

**Architecture:** One Vercel serverless function, `GET /api/presentation`, verifies the caller's marketing-Supabase access token, resolves the app user and project scope the same way the dashboard does (`users` -> `marketers` -> `marketer_projects`), reads projects, apartments, render assets and current documents with a server-only service-role client, signs storage URLs, and returns data already shaped as the app's `Project` / `Apartment` types. The React app signs in against the marketing Supabase project and reads that endpoint; it no longer reads or writes its own `projects` / `apartments` tables.

**Tech Stack:** React 18, TypeScript, Vite 5, `@supabase/supabase-js` 2, Vercel Node functions (`@vercel/node` types), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-22-presentation-upgrade-design.md` (phases 1 and 2 only; phases 3 to 5 get their own plans).

## Global Constraints

- Read-only toward the marketing database: the function issues `select` and `storage.createSignedUrls` only. No insert, update, delete, rpc.
- Never read `leads`, `clients`, budget, campaign or Meta tables. Never return `projects.notes`, `projects.next_milestone`, `project_apartments.notes`, media-budget columns, or any marketer contact detail.
- The service-role key exists only in server env `MARKETING_SUPABASE_SERVICE_ROLE_KEY`. Nothing prefixed `VITE_` may hold it. The repository is public: no key, token or email address is committed.
- Env names: server `MARKETING_SUPABASE_URL`, `MARKETING_SUPABASE_SERVICE_ROLE_KEY`; browser `VITE_MARKETING_SUPABASE_URL`, `VITE_MARKETING_SUPABASE_ANON_KEY`.
- Excluded projects: rows with `deleted_at` set, and the two test projects by id list `EXCLUDED_PROJECT_IDS` in `api/_lib/mapping.ts` (`1d02af7d-d119-47ac-bec8-2f11149f848e`, `71e9deae-2d8b-4776-822c-3788e8a38c99`). Every other in-scope project is returned whatever its status.
- Status mapping: `available` -> `available`, `negotiation` -> `reserved`, `sold` -> `sold`, anything else -> `notMarketing`. A `sold` apartment is returned with `price: 0` and `specialPrice: 0`.
- Project type mapping (normalise quotes and slashes first): contains `38/2` -> `תמ״א 38/2 / פינוי בינוי`; contains `38/1` -> `תמ״א 38/1`; otherwise `פרויקט חדש`.
- Role mapping: marketing `admin` -> app `admin`; `team` -> `sales` with all projects; `marketer` -> `sales` with assigned projects only.
- Signed URL lifetime 6 hours (`SIGNED_URL_TTL_SECONDS = 21600`). Client refetches on window focus and every 120 seconds.
- All user-facing copy in Hebrew, RTL. No English strings such as "Supabase" on the login screen.
- UI existing visual language (dark + gold) is unchanged in this plan.

## Review Focus

1. A marketer with no `marketers` row or no assigned projects: sees an empty state "לא שויכו אליך פרויקטים", not an error and not all projects. (Task 2 test)
2. A project with zero renders (קפלינסקי 12): card and opening screen render with the brand placeholder, gallery tab hidden, no broken image. (Task 1 + Task 5 tests)
3. An expired or revoked session mid-meeting (401 from the API): the app keeps showing the last loaded data, shows a quiet "נדרש חיבור מחדש" banner, and does not blank the screen. (Task 4 test)
4. An apartment row with null `price`, `area`, `floor` or `rooms`: mapped to `0` and displayed as "—" by the screens, never `NaN` or `₪0`. (Task 1 + Task 5 tests)
5. A deactivated dashboard user (`users.active = false` or `deleted_at` set) holding a still-valid token: receives 403 and no data. (Task 3 test)

---

### Task 1: Mapping module and test harness

**Files:**
- Modify: `package.json` (add dev deps `vitest`, `@vercel/node`; script `"test": "vitest run"`)
- Create: `api/_lib/types.ts`, `api/_lib/mapping.ts`
- Test: `api/_lib/mapping.test.ts`

**Interfaces:**
- Consumes: `Project`, `Apartment`, `ApartmentStatus` from `src/types.ts`.
- Produces (in `api/_lib/types.ts`): row types `MarketingProjectRow` (id, slug, name, address, city, status, units, new_units, existing_units, building_count, description, project_type, construction_stage, block, parcel, sort_order, deleted_at), `MarketingApartmentRow` (id, project_id, apartment_number, building, floor, rooms, area, balcony_area, price, status, deleted_at), `MarketingRenderRow` (id, project_id, filename, storage_bucket, storage_path, sort_order, is_featured, modified_at), `MarketingDocumentRow` (id, project_id, document_type, filename, storage_bucket, storage_path, created_at); `SignedUrlLookup = (bucket: string, path: string) => string | undefined`.
- Produces (in `api/_lib/mapping.ts`): `EXCLUDED_PROJECT_IDS: readonly string[]`; `mapApartmentStatus(status: string | null): ApartmentStatus`; `mapProjectType(value: string | null): Project["projectType"]`; `mapApartment(row: MarketingApartmentRow): Apartment`; `mapProject(row: MarketingProjectRow, renders: MarketingRenderRow[], documents: MarketingDocumentRow[], apartments: MarketingApartmentRow[], urlFor: SignedUrlLookup): Project`; `pickCurrentDocuments(documents: MarketingDocumentRow[]): MarketingDocumentRow[]` (newest `created_at` per `document_type`).

- [ ] **Step 1: Write the failing tests** in `api/_lib/mapping.test.ts`:

```ts
it("maps statuses", () => {
  expect(mapApartmentStatus("available")).toBe("available");
  expect(mapApartmentStatus("negotiation")).toBe("reserved");
  expect(mapApartmentStatus("sold")).toBe("sold");
  expect(mapApartmentStatus("weird")).toBe("notMarketing");
  expect(mapApartmentStatus(null)).toBe("notMarketing");
});
it("maps project types across quote and slash variants", () => {
  expect(mapProjectType('תמ"א 38/1')).toBe("תמ״א 38/1");
  expect(mapProjectType('תמ"א 38\\1')).toBe("תמ״א 38/1");
  expect(mapProjectType('תמ"א 38/2')).toBe("תמ״א 38/2 / פינוי בינוי");
  expect(mapProjectType(null)).toBe("פרויקט חדש");
});
it("hides the price of a sold apartment and never emits NaN", () => {
  const sold = mapApartment({ ...aptRow, status: "sold", price: 3_200_000 });
  expect(sold.price).toBe(0); expect(sold.specialPrice).toBe(0);
  const empty = mapApartment({ ...aptRow, price: null, area: null, floor: null, rooms: null, balcony_area: null });
  expect([empty.price, empty.apartmentArea, empty.floor, empty.rooms, empty.balconyArea]).toEqual([0, 0, 0, 0, 0]);
});
it("never copies internal notes", () => {
  const apt = mapApartment({ ...aptRow, notes: "לקוח לחוץ" } as never);
  expect(apt.notes).toBe("");
  expect(JSON.stringify(mapProject({ ...projectRow, notes: "פנימי" } as never, [], [], [], () => undefined))).not.toContain("פנימי");
});
it("uses the featured render as hero, else the first by sort order, else empty", () => {
  expect(mapProject(projectRow, [r2, r1Featured], [], [], urlFor).heroImage).toBe(urlFor(r1Featured.storage_bucket, r1Featured.storage_path));
  expect(mapProject(projectRow, [r2, r3], [], [], urlFor).heroImage).toBe(urlFor(r2.storage_bucket, r2.storage_path));
  const none = mapProject(projectRow, [], [], [], urlFor);
  expect(none.heroImage).toBe(""); expect(none.gallery.exterior).toEqual([]);
});
it("derives the apartment mix from non-deleted inventory", () => {
  const p = mapProject(projectRow, [], [], [apt(3), apt(3), apt(4), apt(5), apt(4.5)], urlFor);
  expect(p.apartmentMix).toMatchObject({ threeRooms: "2", fourRooms: "1", fiveRooms: "1" });
});
it("keeps only the newest document per type and maps it to a project file", () => {
  const p = mapProject(projectRow, [], [oldPriceList, newPriceList, deck], [], urlFor);
  expect(p.projectFiles?.map((f) => [f.type, f.name])).toEqual([["מחירון", newPriceList.filename], ["מצגת", deck.filename]]);
});
```

- [ ] **Step 2: Run** `npm install && npm test` — expected: FAIL, module `./mapping` not found.
- [ ] **Step 3: Implement** `api/_lib/types.ts` and `api/_lib/mapping.ts`. Field decisions the tests do not pin: `location` = `"{address}, {city}"` (address omitted when empty); `neighborhood`, `tagline`, `googleMapsUrl`, `googleMapsEmbedUrl`, `stats.floors`, `stats.occupancy`, `stats.parking`, `stats.storage` = `""`; `description` = row description or `""`; `logoMark` = first two letters of the name; `stats.units` = `new_units ?? units` as string; `stats.newApartments` = `new_units`, `stats.existingApartments` = `existing_units`, `stats.buildings` = `building_count` (empty string when null or 0); all renders go to `gallery.exterior` in sort order (featured first), other categories `[]`; `keyFacts` = non-empty of `[construction_stage, "{n} דירות"]`; document types `price_list` -> `מחירון`, `presentation` -> `מצגת`, others dropped; `isSupabaseBacked: true`; `sortOrder` = row `sort_order`; apartment `number` = `apartment_number`, `parking`/`storage`/`direction` = `""`, `gardenArea` 0, `planAttached` false.
- [ ] **Step 4: Run** `npm test` — expected: PASS (7 tests).
- [ ] **Step 5: Commit** `git add package.json package-lock.json api/_lib && git commit -m "feat: map marketing rows to presentation types"`

### Task 2: User resolution and project scope

**Files:**
- Create: `api/_lib/access.ts`
- Test: `api/_lib/access.test.ts`

**Interfaces:**
- Consumes: a minimal injected reader so tests need no network: `interface MarketingReader { getUserByAuthId(authUserId: string): Promise<{ id: string; email: string; full_name: string; role: string; active: boolean; deleted_at: string | null } | null>; getActiveMarketerId(userId: string): Promise<string | null>; getMarketerProjectIds(marketerId: string): Promise<string[]> }`.
- Produces: `type AppRole = "admin" | "team" | "marketer"`; `interface PresentationUser { id: string; name: string; role: "admin" | "sales"; sourceRole: AppRole }`; `type ProjectScope = string[] | null` (null = all); `resolveUser(reader: MarketingReader, authUserId: string): Promise<{ user: PresentationUser; scope: ProjectScope } | null>` (null = no access).

- [ ] **Step 1: Write the failing tests**

```ts
it("returns null for unknown, inactive or deleted users", async () => {
  expect(await resolveUser(reader({ user: null }), "a")).toBeNull();
  expect(await resolveUser(reader({ user: { ...u, active: false } }), "a")).toBeNull();
  expect(await resolveUser(reader({ user: { ...u, deleted_at: "2026-01-01" } }), "a")).toBeNull();
});
it("gives admin and team every project", async () => {
  expect((await resolveUser(reader({ user: { ...u, role: "admin" } }), "a"))).toMatchObject({ scope: null, user: { role: "admin" } });
  expect((await resolveUser(reader({ user: { ...u, role: "team" } }), "a"))).toMatchObject({ scope: null, user: { role: "sales" } });
});
it("scopes a marketer to assigned projects", async () => {
  const r = await resolveUser(reader({ user: { ...u, role: "marketer" }, marketerId: "m1", projectIds: ["p1", "p2"] }), "a");
  expect(r).toMatchObject({ scope: ["p1", "p2"], user: { role: "sales", sourceRole: "marketer" } });
});
it("gives a marketer with no marketer row an empty scope, not everything", async () => {
  expect((await resolveUser(reader({ user: { ...u, role: "marketer" }, marketerId: null }), "a"))?.scope).toEqual([]);
});
it("applies marketer rules to an unknown role", async () => {
  expect((await resolveUser(reader({ user: { ...u, role: "something" }, marketerId: null }), "a"))?.scope).toEqual([]);
});
```

- [ ] **Step 2: Run** `npm test -- access` — expected: FAIL, module not found.
- [ ] **Step 3: Implement** `resolveUser` in `api/_lib/access.ts`. Unknown roles take the most restrictive path (marketer rules); this deliberately differs from the dashboard's `normalizeAppUserRole`, which defaults to `team`.
- [ ] **Step 4: Run** `npm test -- access` — expected: PASS (5 tests).
- [ ] **Step 5: Commit** `git commit -am "feat: resolve presentation user and project scope"`

### Task 3: `GET /api/presentation`

**Files:**
- Create: `api/_lib/marketingClient.ts`, `api/_lib/loadPresentation.ts`, `api/presentation.ts`
- Modify: `vercel.json` (SPA rewrite must not swallow the API: source `/((?!api/).*)`)
- Test: `api/_lib/loadPresentation.test.ts`

**Interfaces:**
- Consumes: `resolveUser`, `MarketingReader`, `ProjectScope` (Task 2); `mapProject`, `mapApartment`, `EXCLUDED_PROJECT_IDS`, row types (Task 1).
- Produces: `interface PresentationPayload { user: PresentationUser; projects: Project[]; apartments: Apartment[]; generatedAt: string }`; `interface MarketingData extends MarketingReader { verifyToken(token: string): Promise<string | null>; listProjects(scope: ProjectScope): Promise<MarketingProjectRow[]>; listApartments(projectIds: string[]): Promise<MarketingApartmentRow[]>; listRenders(projectIds: string[]): Promise<MarketingRenderRow[]>; listDocuments(projectIds: string[]): Promise<MarketingDocumentRow[]>; signUrls(items: { bucket: string; path: string }[], ttlSeconds: number): Promise<Map<string, string>> }` (map key `"{bucket}/{path}"`); `loadPresentation(data: MarketingData, bearer: string | undefined): Promise<{ status: 200; body: PresentationPayload } | { status: 401 | 403; body: { error: string } }>`; `createMarketingData(): MarketingData` in `marketingClient.ts` (the only file that touches `process.env` and `createClient`); default export handler in `api/presentation.ts` that rejects non-GET with 405, calls `loadPresentation`, sets `Cache-Control: private, no-store`.

- [ ] **Step 1: Write the failing tests** against a fake `MarketingData`:

```ts
it("401 without a bearer token or with one that does not verify", async () => {
  expect((await loadPresentation(fake(), undefined)).status).toBe(401);
  expect((await loadPresentation(fake({ authUserId: null }), "Bearer x")).status).toBe(401);
});
it("403 for a deactivated user with a valid token", async () => {
  expect((await loadPresentation(fake({ user: { ...u, active: false } }), "Bearer x")).status).toBe(403);
});
it("returns only in-scope projects and their apartments", async () => {
  const res = await loadPresentation(fake({ role: "marketer", projectIds: ["p1"] }), "Bearer x");
  expect(res.status).toBe(200);
  if (res.status !== 200) return;
  expect(res.body.projects.map((p) => p.id)).toEqual(["p1"]);
  expect(new Set(res.body.apartments.map((a) => a.projectId))).toEqual(new Set(["p1"]));
});
it("returns 200 with empty lists for an empty scope and performs no data reads", async () => {
  const data = fake({ role: "marketer", projectIds: [] });
  const res = await loadPresentation(data, "Bearer x");
  expect(res).toMatchObject({ status: 200, body: { projects: [], apartments: [] } });
  expect(data.calls.listApartments).toBe(0);
});
it("drops excluded test projects, deleted projects, deleted apartments and deleted renders", async () => { /* fake includes one of each; assert absent */ });
it("orders projects by sort_order then name, apartments by floor then number", async () => { /* assert order */ });
it("signs each storage object once with the 6 hour ttl", async () => {
  const data = fake({ role: "admin" }); await loadPresentation(data, "Bearer x");
  expect(data.calls.signUrls).toEqual([expect.objectContaining({ ttlSeconds: 21600 })]);
});
```

- [ ] **Step 2: Run** `npm test -- loadPresentation` — expected: FAIL, module not found.
- [ ] **Step 3: Implement** the three files. `createMarketingData` uses `auth.getUser(token)` for verification, selects only the columns named in the Task 1 row types, filters `deleted_at is null` in the query, and batches `createSignedUrls` per bucket. Throw at call time (500 with a generic Hebrew message, details only in the server log) when an env var is missing.
- [ ] **Step 4: Run** `npm test` — expected: PASS (all suites). Run `npx tsc --noEmit` — expected: no errors.
- [ ] **Step 5: Commit** `git add api vercel.json && git commit -m "feat: add read-only presentation API over the marketing database"`

### Task 4: Sign-in and data hook in the app

**Files:**
- Create: `src/lib/marketingAuthClient.ts`, `src/services/presentationApi.ts`, `src/hooks/usePresentationSession.ts`
- Modify: `src/vite-env.d.ts`, `.env.example`
- Test: `src/services/presentationApi.test.ts`, `src/hooks/presentationSessionReducer.test.ts`

**Interfaces:**
- Consumes: `PresentationPayload` (Task 3, imported as a type from `api/_lib/loadPresentation`).
- Produces: `marketingAuth: SupabaseClient | null` built from `VITE_MARKETING_SUPABASE_URL` / `VITE_MARKETING_SUPABASE_ANON_KEY`, `persistSession: true`, storage key `goldlands-presentation-auth`; `fetchPresentation(token: string, fetchImpl?: typeof fetch): Promise<{ kind: "ok"; payload: PresentationPayload } | { kind: "unauthenticated" } | { kind: "forbidden" } | { kind: "error"; message: string }>`; pure reducer `sessionReducer(state: SessionState, event: SessionEvent): SessionState` in `src/hooks/presentationSessionReducer.ts` with `SessionState = { phase: "signedOut" | "loading" | "ready" | "forbidden"; payload: PresentationPayload | null; needsReconnect: boolean; error: string | null }`; hook `usePresentationSession(): { state: SessionState; signIn(email: string, password: string): Promise<boolean>; signOut(): Promise<void>; reload(): Promise<void> }` which refetches on `window` focus and every 120 000 ms.

- [ ] **Step 1: Write the failing tests**

```ts
it("maps 200, 401, 403 and network failure to result kinds", async () => { /* stub fetch for each; assert kind */ });
it("sends the token as a bearer header to /api/presentation", async () => { /* assert url and header */ });
it("keeps the last payload and flags reconnect when a refresh returns unauthenticated", () => {
  const ready = sessionReducer(initial, { type: "loaded", payload });
  const after = sessionReducer(ready, { type: "refreshUnauthenticated" });
  expect(after).toMatchObject({ phase: "ready", payload, needsReconnect: true });
});
it("goes to signedOut when the first load is unauthenticated", () => {
  expect(sessionReducer({ ...initial, phase: "loading" }, { type: "refreshUnauthenticated" }).phase).toBe("signedOut");
});
it("keeps the last payload on a refresh error", () => { /* phase stays ready, payload kept, error set */ });
it("clears everything on signOut and on forbidden", () => { /* payload null */ });
```

- [ ] **Step 2: Run** `npm test -- presentation` — expected: FAIL, modules not found.
- [ ] **Step 3: Implement** the client, the API wrapper, the reducer and the hook. Sign-in error copy: wrong credentials "האימייל או הסיסמה אינם נכונים."; forbidden "אין לך הרשאה למערכת המצגות. יש לפנות למנהל המערכת."; missing env "המערכת אינה מוגדרת. יש לפנות למנהל המערכת."
- [ ] **Step 4: Run** `npm test` — expected: PASS. Run `npx tsc --noEmit` — expected: no errors.
- [ ] **Step 5: Commit** `git add src .env.example && git commit -m "feat: sign in with the marketing account and load live data"`

### Task 5: Wire the app to live data and remove the demo

**Files:**
- Modify: `src/App.tsx`, `src/screens/LoginScreen.tsx`, `src/screens/AllProjectsScreen.tsx`, `src/screens/ProjectOpeningScreen.tsx`, `src/screens/GalleryScreen.tsx`, `src/screens/ApartmentsScreen.tsx`, `src/screens/PriceListScreen.tsx`, `src/components/ProjectSectionNav.tsx`, `src/components/SideNavigation.tsx`, `src/components/AppShell.tsx`, `src/utils/format.ts`, `README.md`
- Create: `src/utils/sections.ts`
- Delete: `src/data/mockData.ts`, `src/data/mockCurrentUser.ts`, `src/data/karlNetterImport.ts`, `supabase/seed_mock_projects_apartments.sql`
- Test: `src/utils/sections.test.ts`, `src/utils/format.test.ts`

**Interfaces:**
- Consumes: `usePresentationSession` (Task 4).
- Produces: `visibleSections(project: Project, apartments: Apartment[]): Screen[]` — always `opening`; `apartments` and `prices` when the project has at least one apartment; `gallery` when any gallery image exists; `plans` when any apartment has `planAttached`; `technical` when `technicalSpecSections` is non-empty; `location` when `googleMapsUrl` or `googleMapsEmbedUrl` is non-empty. `formatPrice(value: number): string` returns `"—"` for `0`, `NaN` or negative, otherwise `₪` with thousands separators; `formatNumber(value: number, unit?: string): string` with the same `"—"` rule.

- [ ] **Step 1: Write the failing tests**

```ts
it("shows only sections that have content", () => {
  expect(visibleSections(projectNoRenders, [])).toEqual(["opening"]);
  expect(visibleSections(projectWithRenders, [apt])).toEqual(["opening", "apartments", "prices", "gallery"]);
});
it("formats missing numbers as a dash", () => {
  expect(formatPrice(0)).toBe("—"); expect(formatPrice(NaN)).toBe("—");
  expect(formatPrice(3250000)).toBe("₪3,250,000"); expect(formatNumber(0, "מ״ר")).toBe("—");
});
```

- [ ] **Step 2: Run** `npm test -- sections format` — expected: FAIL.
- [ ] **Step 3: Implement** `sections.ts` and the `format.ts` additions; run the tests — expected: PASS.
- [ ] **Step 4: Rewire `App.tsx`** to `usePresentationSession`: remove `useAuthProfile`, `useProjectsStore`, demo login, and the routes `readiness`, `admin`, `projectManagement`, `importProject`, `faq`, `summary` (their screen files stay in the repo, unreferenced, for the phase 3 plan); role gates come from `state.payload.user.role`; section nav and the next/back flow use `visibleSections`; the reconnect banner renders when `needsReconnect`. Remove from the presentation screens every editing control (for example "הסר תמונה ראשית", project reordering, file drop zones) and every English/technical label ("Demo Admin", "Supabase Admin"); the header shows the user's name only. Empty states: no projects in scope "לא שויכו אליך פרויקטים"; project without renders shows `BrandLogo` as the hero. `GalleryScreen` hides the category filter when only one category has images. Sold apartments render greyed with status "נמכרה" and no price; `reserved` renders as "שמורה". The "שליחה ללקוח" button is hidden: it currently produces a mock link and real client links are out of this plan's scope.
- [ ] **Step 5: Delete** the four mock/seed files and fix imports. Rewrite `README.md` to describe the live setup and the four env vars (names only).
- [ ] **Step 6: Verify** `npm test` PASS; `npx tsc --noEmit` clean; `npm run build` succeeds; `grep -rn "mockData\|signInDemo\|דמו\|Supabase" src --include=*.tsx` returns nothing.
- [ ] **Step 7: Commit** `git add -A && git commit -m "feat: present live projects and remove demo mode"`

### Task 6: Preview deployment and live verification

**Files:** none in the repo (Vercel project settings).

**Interfaces:** Consumes everything above.

- [ ] **Step 1: Environment variables.** In Vercel project `goldlands-property-presentation`, for Preview and Production: `VITE_MARKETING_SUPABASE_URL`, `VITE_MARKETING_SUPABASE_ANON_KEY`, `MARKETING_SUPABASE_URL` (public values, set by the agent) and `MARKETING_SUPABASE_SERVICE_ROLE_KEY` (secret: the owner sets it, or explicitly approves copying it from the dashboard project's existing env var). Remove the now-unused `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` only after phase 3 decides the fate of the old database.
- [ ] **Step 2: Push** the branch and open the Vercel preview URL.
- [ ] **Step 3: Verify on the preview** as an admin user: the project list shows the real in-scope projects and none of GOLD TOWER, GREEN CITY, HILLS VIEW, NEXT TLV, SEA & SUN, VISTA PARK, "פרויקט טסט שמירה", "פרויקט טקסט"; ערבי נחל shows 23 renders and 16 apartments; קפלינסקי 12 opens with the placeholder and no gallery tab; a sold apartment shows no price. `curl -i <preview>/api/presentation` without a token returns 401.
- [ ] **Step 4: Verify as a marketer user** (owner signs in herself or names a marketer to check with): only assigned projects appear.
- [ ] **Step 5: Freshness check:** owner changes one apartment status in the marketing dashboard; within two minutes, or on refocusing the tab, the presentation shows the change. Revert the change.
- [ ] **Step 6: Production** only after the owner approves the preview: merge to `main`. The stale branches `codex/import-ha-arava-11`, `hotfix/project-uploads` and `integrate/deploy-prep` are left untouched and listed for the owner to decide on.
