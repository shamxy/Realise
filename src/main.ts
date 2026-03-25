import { marked } from "marked";
import "./style.css";

const NOVEL_BASE = "/novel";

type ChapterRef = { id: string; title: string; file: string };

type Manifest = {
  title: string;
  author?: string;
  description?: string;
  /** Optional image under /novel/ (e.g. cover.jpg). Omit or delete the file to hide. */
  coverImage?: string;
  chapters: ChapterRef[];
};

type Route = { kind: "cover" } | { kind: "chapter"; id: string };
type ThemeName = "light" | "dark" | "sepia" | "midnight";
const THEME_STORAGE_KEY = "novel-theme";
const DEFAULT_THEME: ThemeName = "light";
const USERS_STORAGE_KEY = "novel-users";
const ACTIVE_USER_STORAGE_KEY = "novel-active-user";
const PROGRESS_STORAGE_KEY = "novel-progress";
const DEFAULT_USER = "Reader 1";
type ProgressStore = Record<string, string>;

function parseRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, "").trim();
  if (!h || h === "cover") return { kind: "cover" };
  const match = h.match(/^chapter\/(.+)$/);
  if (match) return { kind: "chapter", id: decodeURIComponent(match[1]) };
  return { kind: "cover" };
}

function setChapterHash(id: string): void {
  window.location.hash = `/chapter/${encodeURIComponent(id)}`;
}

function loadUsers(): string[] {
  const raw = localStorage.getItem(USERS_STORAGE_KEY);
  if (!raw) return [DEFAULT_USER];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [DEFAULT_USER];
    const users = parsed
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean);
    return users.length > 0 ? users : [DEFAULT_USER];
  } catch {
    return [DEFAULT_USER];
  }
}

function saveUsers(users: string[]): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function activeUser(): string {
  const users = loadUsers();
  const stored = localStorage.getItem(ACTIVE_USER_STORAGE_KEY)?.trim();
  if (stored && users.includes(stored)) return stored;
  localStorage.setItem(ACTIVE_USER_STORAGE_KEY, users[0]);
  return users[0];
}

function setActiveUser(name: string): void {
  localStorage.setItem(ACTIVE_USER_STORAGE_KEY, name);
}

function loadProgress(): ProgressStore {
  const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const store: ProgressStore = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) store[k] = v;
    }
    return store;
  } catch {
    return {};
  }
}

function saveProgress(store: ProgressStore): void {
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(store));
}

function progressForUser(user: string): string | null {
  return loadProgress()[user] ?? null;
}

function setProgressForUser(user: string, chapterId: string): void {
  const store = loadProgress();
  store[user] = chapterId;
  saveProgress(store);
}

function loadTheme(): void {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme: ThemeName = stored ?? (prefersDark ? "dark" : DEFAULT_THEME);
  document.documentElement.setAttribute("data-theme", theme);
}

async function enterFullscreen(): Promise<void> {
  if (document.fullscreenElement) return;
  // requestFullscreen must be triggered by a user gesture; callers below are click handlers.
  const el = document.documentElement;
  if (el.requestFullscreen) {
    await el.requestFullscreen();
  }
}

async function exitFullscreen(): Promise<void> {
  if (!document.fullscreenElement) return;
  if (document.exitFullscreen) {
    await document.exitFullscreen();
  }
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) return exitFullscreen();
  return enterFullscreen();
}

function syncFullscreenButtonText(): void {
  const btn = document.getElementById("btn-fullscreen") as
    | HTMLButtonElement
    | null;
  if (!btn) return;
  btn.textContent = document.fullscreenElement
    ? "Exit fullscreen"
    : "Fullscreen";
}

function setTheme(theme: ThemeName): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function currentTheme(): ThemeName {
  const t = document.documentElement.getAttribute("data-theme") as ThemeName | null;
  if (!t) return DEFAULT_THEME;
  return t;
}

function menuBarHtml(): string {
  const selected = currentTheme();
  const users = loadUsers();
  const currentUser = activeUser();
  const userOptions = users
    .map(
      (u) =>
        `<option value="${escapeHtml(u)}" ${
          u === currentUser ? "selected" : ""
        }>${escapeHtml(u)}</option>`
    )
    .join("");
  return `
    <div class="menu-bar">
      <label class="menu-item">
        <span>User</span>
        <select id="user-select" aria-label="User">
          ${userOptions}
        </select>
      </label>
      <button type="button" id="btn-new-user" aria-label="Add user">New user</button>
      <label class="menu-item">
        <span>Theme</span>
        <select id="theme-select" aria-label="Theme">
          <option value="light" ${selected === "light" ? "selected" : ""}>Light</option>
          <option value="dark" ${selected === "dark" ? "selected" : ""}>Dark</option>
          <option value="sepia" ${selected === "sepia" ? "selected" : ""}>Sepia</option>
          <option value="midnight" ${selected === "midnight" ? "selected" : ""}>Midnight</option>
        </select>
      </label>
      <button type="button" id="btn-fullscreen" aria-label="Toggle fullscreen">Fullscreen</button>
    </div>
  `;
}

function resolveSavedChapterForUser(manifest: Manifest, user: string): string | null {
  const saved = progressForUser(user);
  if (!saved) return null;
  return manifest.chapters.some((c) => c.id === saved) ? saved : null;
}

function handleUserSwitch(manifest: Manifest): void {
  const user = activeUser();
  const resumeId = resolveSavedChapterForUser(manifest, user);
  if (resumeId) {
    setChapterHash(resumeId);
    return;
  }
  window.location.hash = "/cover";
}

function bindMenuControls(): void {
  const select = document.getElementById("theme-select") as HTMLSelectElement | null;
  if (select) {
    select.value = currentTheme();
    select.addEventListener("change", () => {
      setTheme(select.value as ThemeName);
    });
  }

  const userSelect = document.getElementById("user-select") as HTMLSelectElement | null;
  if (userSelect) {
    userSelect.value = activeUser();
    userSelect.addEventListener("change", () => {
      setActiveUser(userSelect.value);
      if (manifestCache) handleUserSwitch(manifestCache);
    });
  }
  document.getElementById("btn-new-user")?.addEventListener("click", () => {
    const raw = window.prompt("Enter a new user name:");
    const name = raw?.trim();
    if (!name) return;
    const users = loadUsers();
    if (!users.includes(name)) {
      users.push(name);
      saveUsers(users);
    }
    setActiveUser(name);
    if (manifestCache) handleUserSwitch(manifestCache);
  });

  document
    .getElementById("btn-fullscreen")
    ?.addEventListener("click", () => void toggleFullscreen());
  syncFullscreenButtonText();
}

async function fetchManifest(): Promise<Manifest> {
  const res = await fetch(`${NOVEL_BASE}/manifest.json`);
  if (!res.ok) throw new Error(`Could not load manifest (${res.status})`);
  return res.json() as Promise<Manifest>;
}

async function fetchChapter(file: string): Promise<string> {
  const res = await fetch(`${NOVEL_BASE}/chapters/${file}`);
  if (!res.ok) throw new Error(`Could not load chapter (${res.status})`);
  return res.text();
}

function renderCover(manifest: Manifest): void {
  const app = document.getElementById("app");
  if (!app) return;

  const first = manifest.chapters[0];
  const imgSrc =
    manifest.coverImage?.trim() &&
    `${NOVEL_BASE}/${encodeURI(manifest.coverImage.trim())}`;

  app.innerHTML = `
    <div class="cover-page">
      <div class="cover-menu-wrap">${menuBarHtml()}</div>
      <div class="cover-inner">
        ${
          imgSrc
            ? `<div class="cover-art"><img src="${escapeHtml(imgSrc)}" alt="" id="cover-img" /></div>`
            : ""
        }
        <h1 class="cover-title">${escapeHtml(manifest.title)}</h1>
        ${
          manifest.author
            ? `<p class="cover-author">by ${escapeHtml(manifest.author)}</p>`
            : ""
        }
        ${
          manifest.description
            ? `<p class="cover-blurb">${escapeHtml(manifest.description)}</p>`
            : ""
        }
        ${
          first
            ? `<button type="button" class="cover-cta" id="btn-start">Start reading</button>`
            : `<p class="cover-empty">Add chapters in <code>manifest.json</code>.</p>`
        }
      </div>
    </div>
  `;

  bindMenuControls();

  document.getElementById("btn-start")?.addEventListener("click", async () => {
    if (first) {
      try {
        await enterFullscreen();
      } catch {
        // Fullscreen may be blocked by the browser; still allow reading.
      }
      setChapterHash(first.id);
    }
  });

  const img = document.getElementById("cover-img") as HTMLImageElement | null;
  if (img) {
    img.addEventListener("error", () => {
      img.closest(".cover-art")?.remove();
    });
  }
}

function renderReader(
  manifest: Manifest,
  activeId: string | null,
  html: string | null,
  error: string | null,
  loading: boolean
): void {
  const app = document.getElementById("app");
  if (!app) return;

  const idx = activeId
    ? manifest.chapters.findIndex((c) => c.id === activeId)
    : -1;
  const current = idx >= 0 ? manifest.chapters[idx] : null;
  const prev = idx > 0 ? manifest.chapters[idx - 1] : null;
  const next =
    idx >= 0 && idx < manifest.chapters.length - 1
      ? manifest.chapters[idx + 1]
      : null;

  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <a href="#/cover" class="sidebar-cover-link">← Cover</a>
          <h1 class="book-title">${escapeHtml(manifest.title)}</h1>
          ${
            manifest.description
              ? `<p class="book-meta">${escapeHtml(manifest.description)}</p>`
              : ""
          }
        </div>
        <div class="sidebar-menu-wrap">${menuBarHtml()}</div>
        <ul class="chapter-list">
          ${manifest.chapters
            .map(
              (c) => `
            <li>
              <a href="#/chapter/${encodeURIComponent(c.id)}"
                 class="${c.id === activeId ? "active" : ""}"
                 data-chapter-id="${escapeHtml(c.id)}">${escapeHtml(c.title)}</a>
            </li>`
            )
            .join("")}
        </ul>
      </aside>
      <main class="main">
        ${
          error
            ? `<p class="state-message error">${escapeHtml(error)}</p>`
            : loading
              ? `<p class="state-message">Loading…</p>`
              : !activeId
                ? `<p class="state-message">Choose a chapter from the list.</p>`
                : `
        <div class="toolbar">
          <h2 class="chapter-heading">${escapeHtml(current?.title ?? "")}</h2>
          <div class="nav-buttons">
            <button type="button" id="btn-prev" ${prev ? "" : "disabled"}>Previous</button>
            <button type="button" id="btn-next" ${next ? "" : "disabled"}>Next</button>
          </div>
        </div>
        <article class="prose">${html ?? ""}</article>`
        }
      </main>
    </div>
  `;

  bindMenuControls();

  document.getElementById("btn-prev")?.addEventListener("click", () => {
    if (prev) setChapterHash(prev.id);
  });
  document.getElementById("btn-next")?.addEventListener("click", () => {
    if (next) setChapterHash(next.id);
  });
}

function escapeHtml(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

let manifestCache: Manifest | null = null;

async function showCover(manifest: Manifest): Promise<void> {
  renderCover(manifest);
}

async function showChapter(manifest: Manifest, id: string | null): Promise<void> {
  if (!id) {
    renderReader(manifest, null, null, null, false);
    return;
  }

  const ch = manifest.chapters.find((c) => c.id === id);
  if (!ch) {
    renderReader(
      manifest,
      id,
      null,
      "That chapter is not listed in manifest.json.",
      false
    );
    return;
  }

  renderReader(manifest, id, null, null, true);
  try {
    const md = await fetchChapter(ch.file);
    const html = await marked.parse(md, { async: true });
    setProgressForUser(activeUser(), ch.id);
    renderReader(manifest, id, html, null, false);
  } catch (e) {
    renderReader(
      manifest,
      id,
      null,
      e instanceof Error ? e.message : "Failed to load chapter.",
      false
    );
  }
}

async function applyRoute(manifest: Manifest, route: Route): Promise<void> {
  if (route.kind === "cover") {
    await showCover(manifest);
    return;
  }
  await showChapter(manifest, route.id);
}

async function init(): Promise<void> {
  loadTheme();
  saveUsers(loadUsers());
  setActiveUser(activeUser());
  try {
    const manifest = await fetchManifest();
    manifestCache = manifest;

    await applyRoute(manifest, parseRoute());
  } catch (e) {
    const app = document.getElementById("app");
    if (app) {
      app.innerHTML = `<p class="state-message error">${escapeHtml(
        e instanceof Error ? e.message : "Failed to load novel."
      )}</p>`;
    }
  }
}

window.addEventListener("hashchange", async () => {
  if (!manifestCache) return;
  await applyRoute(manifestCache, parseRoute());
});

void init();

document.addEventListener("fullscreenchange", () => {
  syncFullscreenButtonText();
});
