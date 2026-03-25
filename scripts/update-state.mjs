import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const manifestPath = path.join(root, "public", "novel", "manifest.json");
const outputPath = path.join(root, "CURRENT_STATE.md");

const manifestRaw = await readFile(manifestPath, "utf8");
const manifest = JSON.parse(manifestRaw);

const title = typeof manifest.title === "string" ? manifest.title : "Unknown";
const author =
  typeof manifest.author === "string" && manifest.author.trim()
    ? manifest.author.trim()
    : "Unknown";
const chapters = Array.isArray(manifest.chapters) ? manifest.chapters : [];
const chapterCount = chapters.length;
const firstChapter =
  chapterCount > 0 && typeof chapters[0]?.title === "string"
    ? chapters[0].title
    : "None";
const hasCover = typeof manifest.coverImage === "string" && !!manifest.coverImage;

const today = new Date();
const yyyy = String(today.getFullYear());
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");
const dateStamp = `${yyyy}-${mm}-${dd}`;

const lines = [
  "# Current State",
  "",
  `Last updated: ${dateStamp}`,
  "",
  "## Goal",
  `Local web platform for hosting and reading the novel **${title}**.`,
  "",
  "## Book Metadata",
  `- Title: ${title}`,
  `- Author (cover): ${author}`,
  `- Chapter count: ${chapterCount}`,
  `- First chapter: ${firstChapter}`,
  `- Cover image configured: ${hasCover ? "Yes" : "No"}`,
  "",
  "## Live Features",
  "- Cover page appears first.",
  "- Large animated rainbow-gloss title for `Realise`.",
  "- Start reading flow with chapter navigation.",
  "- Markdown chapter rendering from `public/novel/chapters/`.",
  "- Theme + fullscreen controls in one shared menu bar.",
  "- Theme options: Light, Dark, Sepia, Midnight.",
  "- Local user profiles with per-user saved chapter progress.",
  "",
  "## Key Files",
  "- `src/main.ts`: routing, rendering, user profiles, progress, controls.",
  "- `src/style.css`: layout, theme styles, cover effects, menu bar UI.",
  "- `public/novel/manifest.json`: title, author, chapter list, optional cover image.",
  "- `public/novel/chapters/`: chapter markdown files.",
  "- `index.html`: app shell and browser tab title.",
  "",
  "## Data Storage (localStorage)",
  "- `novel-theme`: selected theme.",
  "- `novel-users`: list of user names.",
  "- `novel-active-user`: currently selected user.",
  "- `novel-progress`: saved chapter by user.",
  "",
  "## Hosting Notes",
  "- Safe to host on GitHub Pages.",
  "- Reader progress is local to each browser/device profile.",
  "- No server-side account sync yet.",
  "",
  "## Next Tasks",
  "- [ ] Add visible progress indicator (`Chapter X / Y`) near user controls.",
  "- [ ] Add optional `continue reading` shortcut on cover.",
  "- [ ] Add import/export for progress backup.",
  "- [ ] Replace sample chapter content with full manuscript text.",
  "",
  "## Open Issues / Constraints",
  "- Fullscreen depends on browser permissions/user gesture.",
  "- Clearing browser site data removes local progress.",
  "",
];

await writeFile(outputPath, lines.join("\n"), "utf8");
console.log(`Updated ${path.relative(root, outputPath)}`);
