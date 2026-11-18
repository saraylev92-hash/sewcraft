// Server-only content loader. Every *.json file in content/projects is a project —
// adding a project means adding a file, no application code changes.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { Category, GlossaryTerm, Project, Technique } from "./types";
import { validateProject, type Issue } from "./validate";
import { normalizeProject, type ToolCatalog } from "./normalize";
import type { ProjectTranslation } from "./localize";

const ROOT = path.join(process.cwd(), "content");

function readJson<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")) as T;
}

export const getTechniques = cache((): Technique[] => readJson<Technique[]>("techniques.json"));
export const getGlossary = cache((): GlossaryTerm[] => readJson<GlossaryTerm[]>("glossary.json"));
export const getCategories = cache((): Category[] => readJson<Category[]>("categories.json"));

export const getToolCatalog = cache((): ToolCatalog => readJson<ToolCatalog>("tools.json"));

/** Loads editorial (content/projects) and community (content/community) guides, normalised + validated. */
export const getAllProjects = cache((): { project: Project; issues: Issue[] }[] => {
  const techniques = getTechniques();
  const catalog = getToolCatalog();
  return (["projects", "community"] as const).flatMap((dir) => {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) return [];
    return fs
      .readdirSync(full)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => {
        const raw = readJson<Record<string, unknown>>(`${dir}/${f}`);
        if (dir === "community") raw.source = "community";
        const { project, issues: normIssues } = normalizeProject(raw, catalog);
        const he = path.join(ROOT, "i18n", "he", dir, f);
        if (fs.existsSync(he)) project.i18n = { he: JSON.parse(fs.readFileSync(he, "utf8")) as ProjectTranslation };
        const issues: Issue[] = [...normIssues.map((m) => ({ level: "error" as const, rule: "content", message: m })), ...validateProject(project, techniques)];
        return { project, issues };
      });
  });
});

/** Only published projects with no validation errors are visible in discovery. */
export const getPublishedProjects = cache((): Project[] =>
  getAllProjects()
    .filter(({ project, issues }) => project.review.status === "published" && !issues.some((i) => i.level === "error"))
    .map(({ project }) => project),
);

export function getProject(id: string): Project | undefined {
  return getPublishedProjects().find((p) => p.id === id);
}

export { toCard };
export type { ProjectCard };
import { toCard, type ProjectCard } from "./cards";

export function getCards(): ProjectCard[] {
  return getPublishedProjects().map(toCard);
}
