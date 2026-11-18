import Link from "next/link";
import { notFound } from "next/navigation";
import { getCards, getTechniques } from "@/lib/content";
import SceneView from "@/components/scene/SceneView";
import ProjectCard from "@/components/ProjectCard";
import { IconAlert } from "@/components/icons";
import T from "@/lib/i18n/T";

export function generateStaticParams() {
  return getTechniques().map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: getTechniques().find((t) => t.id === id)?.name ?? "Technique" };
}

export default async function TechniquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = getTechniques().find((x) => x.id === id);
  if (!t) notFound();
  const related = getCards().filter((c) => c.techniques.includes(t.id));
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <Link href="/techniques" className="text-sm text-ink-soft hover:text-ink"><T k="learn.back" /></Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="card overflow-hidden"><SceneView scene={t.scene} tones={{}} vars={{}} units="metric" title={t.alt} legend className="bg-[var(--canvas)] [&>figcaption]:p-3" /></div>
        <div>
          <h1 className="font-display text-3xl font-semibold">{t.name}</h1>
          <p className="mt-2 text-lg text-ink-soft">{t.summary}</p>
          <p className="mt-4 leading-relaxed">{t.explanation}</p>
          <p className="mt-4 text-xs text-ink-soft"><T k="learn.video" /></p>
        </div>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <h2 className="font-display text-xl font-semibold"><T k="learn.how" /></h2>
          <ol className="mt-3 space-y-2">
            {t.steps.map((s, i) => <li key={i} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-terra text-xs font-bold text-white">{i + 1}</span><span className="pt-0.5">{s}</span></li>)}
          </ol>
        </section>
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-semibold"><T k="learn.need" /></h2>
            <ul className="mt-2 flex flex-wrap gap-2">{t.tools.map((x) => <li key={x} className="chip">{x}</li>)}</ul>
          </section>
          <section className="rounded-[1.25rem] bg-terra-soft p-5">
            <h2 className="flex items-center gap-2 font-semibold"><IconAlert size={18} /><T k="learn.mistakes" /></h2>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm">{t.mistakes.map((m) => <li key={m}>{m}</li>)}</ul>
          </section>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl font-semibold"><T k="learn.practise" /></h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((c) => <ProjectCard key={c.id} card={c} />)}</div>
        </section>
      )}
    </div>
  );
}
