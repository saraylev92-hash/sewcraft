import Link from "next/link";
import { getAllProjects } from "@/lib/content";
import T from "@/lib/i18n/T";

export const metadata = { title: "Content review" };

const STATUS = ["draft", "review", "published"] as const;
const STATUS_KEY = { draft: "studio.content.status.draft", review: "studio.content.status.review", published: "studio.content.status.published" } as const;

export default function ContentPage() {
  const all = getAllProjects();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <Link href="/studio?tab=setup" className="text-sm text-ink-soft"><T k="studio.content.back" /></Link>
      <h1 className="mt-2 font-display text-3xl font-semibold"><T k="studio.content.title" /></h1>
      <p className="mt-2 max-w-3xl text-sm text-ink-soft">
        <T k="studio.content.i1" /><code>content/projects/*.json</code><T k="studio.content.i2" /><strong><T k="studio.content.i3" /></strong><T k="studio.content.i4" /><strong><T k="studio.content.i5" /></strong><T k="studio.content.i6" /><code>npm run validate</code><T k="studio.content.i7" />
      </p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full min-w-[720px] text-start text-sm">
          <thead className="bg-beige/60 text-xs uppercase tracking-wide text-ink-soft"><tr><th className="p-3"><T k="studio.content.project" /></th><th className="p-3"><T k="studio.content.workflow" /></th><th className="p-3"><T k="studio.content.testSewn" /></th><th className="p-3"><T k="studio.content.errors" /></th><th className="p-3"><T k="studio.content.warnings" /></th><th className="p-3"><T k="studio.content.visible" /></th></tr></thead>
          <tbody>
            {all.map(({ project: p, issues }) => {
              const errors = issues.filter((i) => i.level === "error");
              const warns = issues.filter((i) => i.level === "warning");
              const visible = p.review.status === "published" && !errors.length;
              return (
                <tr key={p.id} className="border-t border-line align-top">
                  <td className="p-3"><p className="font-semibold">{p.title}</p><p className="text-xs text-ink-soft">{p.review.reviewer ? <T k="studio.content.meta" vars={{ steps: p.steps.length, pieces: p.pieces.length, updated: p.review.updated, reviewer: p.review.reviewer }} /> : <T k="studio.content.metaNoReviewer" vars={{ steps: p.steps.length, pieces: p.pieces.length, updated: p.review.updated }} />}</p></td>
                  <td className="p-3">
                    <ol className="flex items-center gap-1 text-xs">{STATUS.map((s, i) => <li key={s} className={`rounded-full px-2 py-0.5 ${STATUS.indexOf(p.review.status) >= i ? "bg-sage text-white" : "bg-beige text-ink-soft"}`}><T k={STATUS_KEY[s]} /></li>)}</ol>
                  </td>
                  <td className="p-3">{p.review.technicallyValidated ? <T k="studio.content.yes" /> : <span className="text-[#8a6a1f]"><T k="studio.content.notYet" /></span>}</td>
                  <td className="p-3">{errors.length ? <ul className="space-y-1 text-terra">{errors.map((e, i) => <li key={i}>[{e.rule}] {e.message}</li>)}</ul> : "0"}</td>
                  <td className="p-3">{warns.length ? <ul className="space-y-1 text-xs text-ink-soft">{warns.map((e, i) => <li key={i}>[{e.rule}] {e.message}</li>)}</ul> : "0"}</td>
                  <td className="p-3">{visible ? <Link href={`/projects/${p.id}`} className="font-semibold text-terra"><T k="studio.content.live" /></Link> : <T k="studio.content.hidden" />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink-soft"><T k="studio.content.footer" /></p>
    </div>
  );
}
