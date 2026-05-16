import type { BinderInsights } from "@/mca-utils/binders/binder-insights-types";

export type ExportSlot = {
  page: number;
  slot_index: number;
  name: string | null;
  image_url: string | null;
};

export type BinderExportInput = {
  binderId: string;
  name: string;
  description: string | null;
  ownerDisplay: string;
  insights: BinderInsights | null;
  slots: ExportSlot[];
  links: Array<{ label: string; target_binder_id: string; target_name: string }>;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildBinderExportHtml(input: BinderExportInput): string {
  const overview = input.insights?.overview;
  const sets = input.insights?.sets ?? [];
  const byPage = new Map<number, ExportSlot[]>();
  for (const slot of input.slots) {
    const list = byPage.get(slot.page) ?? [];
    list.push(slot);
    byPage.set(slot.page, list);
  }
  const pages = [...byPage.entries()].sort((a, b) => a[0] - b[0]);

  const setRows = sets
    .slice(0, 24)
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.set_name)}</td><td>${s.progress.owned}</td><td>${s.progress.total}</td><td>${Math.round(s.progress.percent)}%</td></tr>`
    )
    .join("");

  const pageBlocks = pages
    .map(([page, slots]) => {
      const cells = slots
        .sort((a, b) => a.slot_index - b.slot_index)
        .map((slot) => {
          const img = slot.image_url
            ? `<img src="${escapeHtml(slot.image_url)}" alt="${escapeHtml(slot.name ?? "Card")}" />`
            : `<span class="empty">Empty</span>`;
          return `<div class="cell">${img}<p>${escapeHtml(slot.name ?? "")}</p></div>`;
        })
        .join("");
      return `<section><h3>Page ${page + 1}</h3><div class="grid">${cells}</div></section>`;
    })
    .join("");

  const linkList = input.links
    .map(
      (l) =>
        `<li><a href="./${escapeHtml(l.target_binder_id)}.html">${escapeHtml(l.label)}</a> — ${escapeHtml(l.target_name)}</li>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.name)} · MyCardArchive Binder Export</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; background: #0f1419; color: #e8eaed; }
    h1 { margin: 0 0 0.5rem; }
    .meta { color: #9aa0a6; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid #333; padding: 0.5rem; text-align: left; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .cell { border: 1px solid #333; border-radius: 8px; padding: 0.5rem; text-align: center; min-height: 140px; }
    .cell img { max-width: 100%; max-height: 120px; object-fit: contain; }
    .empty { color: #666; font-size: 0.75rem; }
    section { margin-top: 2rem; }
    ul.links { padding-left: 1.25rem; }
    a { color: #f59e0b; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(input.name)}</h1>
    <p class="meta">Exported binder · ${escapeHtml(input.ownerDisplay)} · ${escapeHtml(input.binderId)}</p>
    ${input.description ? `<p>${escapeHtml(input.description)}</p>` : ""}
  </header>
  <section>
    <h2>Overview</h2>
    <ul>
      <li>Total cards: ${overview?.total_cards ?? 0}</li>
      <li>Unique catalog cards: ${overview?.unique_catalog_cards ?? 0}</li>
      <li>Sets represented: ${overview?.sets_represented ?? 0}</li>
    </ul>
  </section>
  ${setRows ? `<section><h2>Set progress</h2><table><thead><tr><th>Set</th><th>Owned</th><th>Total</th><th>%</th></tr></thead><tbody>${setRows}</tbody></table></section>` : ""}
  ${linkList ? `<section><h2>Linked binders</h2><ul class="links">${linkList}</ul></section>` : ""}
  ${pageBlocks}
  <footer><p class="meta">Static export from MyCardArchive — no JavaScript required.</p></footer>
</body>
</html>`;
}
