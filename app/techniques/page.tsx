import Link from "next/link";
import { getPublishedProjects, getTechniques } from "@/lib/content";
import SceneView from "@/components/scene/SceneView";
import T from "@/lib/i18n/T";

export const metadata = { title: "Sewing techniques" };

export default function TechniquesPage() {
  const techniques = getTechniques();
  const projects = getPublishedProjects();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl font-semibold md:text-4xl"><T k="learn.title" /></h1>
      <p className="mt-2 max-w-2xl text-ink-soft"><T k="learn.intro" /></p>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {techniques.map((t) => {
          const used = projects.filter((p) => p.techniques.includes(t.id)).length;
          return (
            <li key={t.id}>
              <Link href={`/techniques/${t.id}`} className="card block h-full overflow-hidden transition hover:-translate-y-0.5">
                <SceneView scene={t.scene} tones={{}} vars={{}} units="metric" title={t.alt} className="bg-[var(--canvas)]" />
                <div className="p-4">
                  <h2 className="font-display text-lg font-semibold">{t.name}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{t.summary}</p>
                  {used > 0 && <p className="mt-2 text-xs font-semibold text-terra"><T k={used > 1 ? "learn.usedMany" : "learn.usedOne"} vars={{ n: used }} /></p>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
