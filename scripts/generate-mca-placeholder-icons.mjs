#!/usr/bin/env node
/**
 * Generates neutral placeholder SVGs for /public/icons (7-folder taxonomy).
 * Run from repo root: node scripts/generate-mca-placeholder-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "public", "icons");

const TODO = "<!-- Replace with final branded icon -->\n";

const S = {
  stroke:
    'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"',
};

function svg(children, { fill = "none" } = {}) {
  return `${TODO}<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${fill}" aria-hidden="true">${children}</svg>`;
}

function p(d) {
  return `<path d="${d}" ${S.stroke}/>`;
}

function c(x, y, r) {
  return `<circle cx="${x}" cy="${y}" r="${r}" ${S.stroke}/>`;
}

/** Outline icons */
const OUTLINE = {
  check: p("M5 13l4 4L19 7"),
  close: p("M6 6l12 12M18 6L6 18"),
  plus: p("M12 5v14M5 12h14"),
  minus: p("M5 12h14"),
  warning: p("M12 9v4M12 17h.01M10.3 4.6L3.2 17.1c-.5 1 .1 2.2 1.3 2.2h15c1.2 0 1.8-1.2 1.3-2.2L13.7 4.6c-.6-1.1-2-1.1-2.6 0z"),
  drag: p("M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"),
  "chevron-down": p("M6 9l6 6 6-6"),
  "chevron-up": p("M18 15l-6-6-6 6"),
  "chevron-left": p("M15 18l-6-6 6-6"),
  "chevron-right": p("M9 6l6 6-6 6"),
  menu: p("M4 7h16M4 12h16M4 17h16"),
  search: p("M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15zM16.5 16.5L21 21"),
  filter: p("M4 6h16M7 12h10M10 18h4"),
  sort: p("M7 6v14M4 9l3-3 3 3M17 18V4M14 7l3-3 3 3"),
  "external-link": p("M14 3h7v7M10 14L21 3M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6"),
  "more-horizontal": p("M6 12h.01M12 12h.01M18 12h.01"),
  copy: p("M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-2M16 4h2a2 2 0 012 2v12M8 4a2 2 0 012-2h6l4 4v2"),
  edit: p("M12 20h9M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4 11.5-11.5"),
  home: p("M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"),
  dashboard: p("M4 4h7v7H4V4zM13 4h7v4h-7V4zM13 11h7v9h-7v-9zM4 15h7v5H4v-5z"),
  community: p("M16 11a4 4 0 10-8 0 4 4 0 008 0zM3 20.5a6 6 0 0112 0M18 20a4 4 0 00-4-4"),
  feed: p("M4 6h16M4 12h10M4 18h7"),
  creator: p("M12 3l9 4.5v3c0 5-3.5 9-9 12-5.5-3-9-7-9-12v-3L12 3z"),
};

/** Solid destructive */
function trashSolid() {
  return `${TODO}<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 1h4v2H4V4h4l1-1zm1 6v9M14 9v9M6 9h12v10a2 2 0 01-2 2H8a2 2 0 01-2-2V9z" fill="currentColor"/></svg>`;
}

const COLLECTION = {
  binder: p("M6 4h9a2 2 0 012 2v14a1 1 0 01-1 1H6a2 2 0 01-2-2V6a2 2 0 012-2zM6 4v16M9 8h6"),
  deck: p("M4 6a2 2 0 012-2h12l-2 16H6L4 6zM8 10h8M8 14h6"),
  cards: p("M5 7l7-3 7 3v10l-7 3-7-3V7zM5 7l7 3 7-3M12 10v10"),
  catalog: p("M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"),
  analytics: p("M4 19V5M9 19v-6M14 19V9M19 19v-9"),
  inventory: p("M8 6h13M8 12h13M8 18h13M4 6h.01M4 12h.01M4 18h.01"),
  grid: p("M4 4h7v7H4V4zM13 4h7v7h-7V4zM4 13h7v7H4v-7zM13 13h7v7h-7v-7z"),
  list: p("M8 6h13M8 12h13M8 18h13M4 6h.01M4 12h.01M4 18h.01"),
  "arrow-left": p("M15 18l-6-6 6-6M21 12H9"),
  "arrow-right": p("M9 18l6-6-6-6M3 12h12"),
  "slot-empty": p("M5 5h14v14H5V5zM9 9h6v6H9V9z"),
  "zone-main": p("M4 5h16v14H4V5zM8 9h8v6H8V9z"),
  "zone-sideboard": p("M5 5h14v14H5V5zM8 12h8M8 16h5"),
  "zone-commander": p("M12 5l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z"),
  "set-symbol": p("M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5"),
};

const TRADING = {
  trades: p("M8 7h12M8 12h8M8 17h12M4 7h.01M4 12h.01M4 17h.01"),
  matching: p("M8 12a4 4 0 108 0 4 4 0 00-8 0zM3 20a7 7 0 0114 0M16 8l5-2v6l-5-2"),
  marketplace: p("M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10"),
  offer: p("M12 3l8 4.5v5c0 4-3 7.5-8 9-5-1.5-8-5-8-9v-5L12 3z"),
  handshake: p("M11 14l-2 2a2 2 0 01-3-3l2-2M13 10l4-4a2 2 0 113 3l-4 4"),
};

const SCAN = {
  camera: p("M4 8h3l2-2h6l2 2h3a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8a2 2 0 012-2zM12 17a4 4 0 100-8 4 4 0 000 8z"),
  "scan-frame": p("M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2M8 4h8v16H8V4z"),
  iris: p("M12 5c5 0 9 3.5 9 7s-4 7-9 7-9-3.5-9-7 4-7 9-7zM12 9a3 3 0 100 6 3 3 0 000-6z"),
};

const ACTIVITY = {
  bell: p("M14 20a2 2 0 01-4 0M6 8a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6"),
  pulse: p("M4 12h3l2-6 4 12 2-6h5"),
  history: p("M12 8v5l3 2M12 21a9 9 0 110-18 9 9 0 010 18z"),
  sparkles: p("M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"),
  timeline: p("M6 4h.01M6 12h.01M6 20h.01M10 5h8M10 12h8M10 19h8"),
  feed: p("M4 6h16M4 12h10M4 18h7"),
};

const ACCOUNT = {
  user: p("M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0"),
  achievements: p("M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 16.9 7.1 18.2l1-5.5-4-3.9L9.5 8 12 3z"),
  billing: p("M4 7h16v10H4V7zM4 11h16M8 15h4"),
  "sign-out": p("M10 17l-1 1H5V6h4l1 1M14 12H4M19 12l-3-3m3 3l-3 3"),
  settings: p("M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.4-1l1.5-1.2a.3.3 0 000-.5l-1.4-2.4a.3.3 0 00-.4-.1l-1.7.7a7 7 0 00-1.7-1l-.3-1.8a.3.3 0 00-.3-.3h-2.8a.3.3 0 00-.3.3l-.3 1.8c-.6.2-1.2.5-1.7 1l-1.7-.7a.3.3 0 00-.4.1l-1.4 2.4a.3.3 0 000 .5l1.5 1.2c0 .3-.1.7-.1 1s0 .7.1 1l-1.5 1.2a.3.3 0 000 .5l1.4 2.4c.1.2.3.2.4.1l1.7-.7c.5.5 1.1.8 1.7 1l.3 1.8c0 .2.2.3.3.3h2.8c.2 0 .3-.1.3-.3l.3-1.8c.6-.2 1.2-.5 1.7-1l1.7.7c.2.1.4 0 .4-.1l1.4-2.4a.3.3 0 000-.5l-1.5-1.2z"),
  support: p("M12 21a9 9 0 100-18 9 9 0 000 18zM9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 007 0"),
};

const SYSTEM = {
  info: p("M12 16v-4M12 8h.01M12 22a10 10 0 110-20 10 10 0 010 20z"),
  alert: p("M12 9v4M12 17h.01M10.3 4.6L3.2 17.1c-.5 1 .1 2.2 1.3 2.2h15c1.2 0 1.8-1.2 1.3-2.2L13.7 4.6c-.6-1.1-2-1.1-2.6 0z"),
  help: p("M12 16v-1.5c0-1.5 1-2 2-2.5 1-.5 2-1.2 2-2.5a4 4 0 10-8 0M12 18h.01"),
  success: p("M12 22a10 10 0 110-20 10 10 0 010 20zM8.5 12.5l2.5 2.5 5-5"),
  loading: `${c(12, 12, 9)}<path d="M12 3v3" ${S.stroke}/>`,
  refresh: p("M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0019 5M19 19a9 9 0 00-12-4"),
};

const RARITY = {
  common: c(12, 12, 3),
  uncommon: p("M12 3l2.2 4.5L19 8.5l-3.5 3.4.8 5.1L12 15.8l-4.3 1.2.8-5.1L5 8.5l4.8-1L12 3z"),
  rare: p("M12 2l3 6 6 .9-4.3 4.2 1 6-5.7-3-5.7 3 1-6L9 8.9l6-.9L12 2z"),
  ultra: p("M12 2l2.5 7.5H22l-6 4.5 2.3 7-6.3-4.5-6.3 4.5L8 14l-6-4.5h7.5L12 2z"),
  secret: p("M12 3l2 4h4l-3 3 1 4-4-2.5L8 14l1-4-3-3h4l2-4z"),
};

function write(rel, body) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body, "utf8");
}

function emitGroup(dir, obj) {
  for (const [name, content] of Object.entries(obj)) {
    write(path.join(dir, `${name}.svg`), svg(content));
  }
}

emitGroup("ui", OUTLINE);
write("ui/trash.svg", trashSolid());

emitGroup("collection", COLLECTION);
emitGroup("trading", TRADING);
emitGroup("scan", SCAN);
emitGroup("activity", ACTIVITY);
emitGroup("account", ACCOUNT);
emitGroup("system", SYSTEM);
emitGroup(path.join("collection", "rarity"), RARITY);

console.log("Wrote MCA placeholder icons under public/icons/{ui,collection,trading,scan,activity,account,system,collection/rarity}");
