import { notFound } from "next/navigation";
import GarmentPattern from "@/components/garments/GarmentPattern";
import { DESIGNS, getDesign } from "@/lib/garments/designs";

export function generateStaticParams() {
  return DESIGNS.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = getDesign(id);
  return { title: d?.name.en ?? "Garment pattern", description: d?.blurb.en };
}

export default async function GarmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = getDesign(id);
  if (!d) notFound();
  return <GarmentPattern id={d.id} />;
}
