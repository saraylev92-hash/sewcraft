import Link from "next/link";
import { getCards, getCategories, getToolCatalog } from "@/lib/content";
import ProjectCard from "@/components/ProjectCard";
import HeroSearch from "@/components/HeroSearch";
import HomePersonal from "@/components/HomePersonal";
import { SectionHeading } from "@/components/bits";
import T from "@/lib/i18n/T";

export default function Home() {
  const cards = getCards();
  const categories = getCategories();
  const featured = cards.filter((c) => c.featured && c.source !== "community");
  const popular = [...cards].filter((c) => c.source !== "community").sort((a, b) => b.popularity - a.popularity).slice(0, 4);
  const community = cards.filter((c) => c.source === "community");
  const editorial = cards.filter((c) => c.source !== "community");
  const quick = editorial.filter((c) => c.minutes[1] <= 120).sort((a, b) => a.minutes[0] - b.minutes[0]);
  const counts = (id: string) => cards.filter((c) => c.category === id || c.tags.includes(id) || (id === "beginner" && c.difficulty === "beginner")).length;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-12 pt-10 md:grid-cols-[1.1fr_1fr] md:px-8 md:pb-20 md:pt-16">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-terra"><T k="discover.home.stages" /></p>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] md:text-6xl"><T k="discover.home.title" /></h1>
            <p className="mt-4 max-w-lg text-lg text-ink-soft"><T k="discover.home.lead" /></p>
            <HeroSearch />
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/explore" className="btn btn-primary"><T k="discover.home.explore" /></Link>
              <Link href="/projects/classic-tote" className="btn btn-secondary"><T k="discover.home.tryTote" /></Link>
            </div>
          </div>
          <HeroArt />
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 md:px-8">
        <HomePersonal cards={cards} catalog={getToolCatalog()} />

        <section aria-labelledby="cat-h">
          <SectionHeading title={<T k="discover.home.byCategory" />} />
          <h2 id="cat-h" className="sr-only"><T k="discover.home.categories" /></h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/explore?cat=${c.id}`} className="card group flex h-full flex-col gap-1 p-4 transition hover:-translate-y-0.5">
                  <span className="mb-2 h-10 w-10 rounded-full" style={{ background: `radial-gradient(circle at 30% 30%, #fff8 0 18%, transparent 19%), ${c.tone}` }} aria-hidden />
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-xs text-ink-soft">{c.blurb}</span>
                  <span className="mt-auto pt-2 text-xs font-semibold text-terra">{counts(c.id) ? <T k={counts(c.id) > 1 ? "discover.count.projectsMany" : "discover.count.projectsOne"} vars={{ n: counts(c.id) }} /> : <T k="discover.home.comingSoon" />}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeading title={<T k="discover.home.featured" />} sub={<T k="discover.home.featuredSub" />} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => <ProjectCard key={c.id} card={c} size="lg" />)}
          </div>
        </section>

        <section>
          <SectionHeading title={<T k="discover.home.popular" />} action={<Link href="/explore?sort=popular" className="text-sm font-semibold text-terra"><T k="discover.home.seeAll" /></Link>} />
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:grid md:grid-cols-4 md:px-0">
            {popular.map((c) => <div key={c.id} className="w-64 shrink-0 snap-start md:w-auto"><ProjectCard card={c} /></div>)}
          </div>
        </section>

        <section className="rounded-[1.75rem] bg-sage-soft p-5 md:p-8">
          <SectionHeading title={<T k="discover.home.community" />} sub={<T k="discover.home.communitySub" />} action={<Link href="/community/new" className="btn btn-sage"><T k="discover.home.shareGuide" /></Link>} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {community.slice(0, 3).map((c) => <ProjectCard key={c.id} card={c} />)}
          </div>
          <Link href="/community" className="mt-4 inline-block text-sm font-semibold text-[#4c6142]"><T k="discover.home.browseCommunity" /></Link>
        </section>

        <section>
          <SectionHeading title={<T k="discover.home.quick" />} sub={<T k="discover.home.quickSub" />} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {quick.slice(0, 8).map((c) => <ProjectCard key={c.id} card={c} />)}
          </div>
        </section>
      </div>
    </div>
  );
}

function HeroArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md" aria-hidden>
      <svg viewBox="0 0 400 400" className="h-full w-full">
        <defs>
          <pattern id="hdots" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#C26A4E" /><circle cx="3" cy="3" r="1.1" fill="#e2a48e" /><circle cx="9" cy="9" r="1.1" fill="#e2a48e" /></pattern>
          <pattern id="hsage" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#9DB09A" /><path d="M0 10L10 0" stroke="#b8c8b4" strokeWidth="1.2" /></pattern>
        </defs>
        <circle cx="200" cy="200" r="180" fill="#efe5d6" />
        <rect x="60" y="90" width="150" height="190" rx="6" fill="url(#hsage)" transform="rotate(-8 135 185)" />
        <rect x="150" y="150" width="190" height="170" rx="6" fill="url(#hdots)" />
        <path d="M195 152 C200 70, 290 70, 295 152" fill="none" stroke="#8E4A36" strokeWidth="12" strokeLinecap="round" />
        <polyline points="150,165 340,165" fill="none" stroke="#2F2A26" strokeWidth="2.5" strokeDasharray="7 5" className="stitch-anim" />
        <g transform="translate(280 250) rotate(-30)">
          <circle cx="-18" cy="-8" r="9" fill="none" stroke="#2B2622" strokeWidth="3" />
          <circle cx="-18" cy="14" r="9" fill="none" stroke="#2B2622" strokeWidth="3" />
          <path d="M-9 -4 L40 8 M-9 10 L40 -2" stroke="#8a9298" strokeWidth="5" strokeLinecap="round" />
        </g>
        <rect x="40" y="300" width="180" height="22" rx="3" fill="#F3D9A2" />
        {Array.from({ length: 17 }).map((_, i) => <line key={i} x1={48 + i * 10} y1="300" x2={48 + i * 10} y2={i % 2 ? 308 : 314} stroke="#8b6b3a" strokeWidth="1.4" />)}
      </svg>
    </div>
  );
}
