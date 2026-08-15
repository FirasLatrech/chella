import { notFound } from "next/navigation";
import { Shell } from "@/components/dashboard/shell";
import { requireAuth } from "@/lib/api";

// Sidebar destinations that exist as routes but have no content yet.
const SECTIONS: Record<string, string> = {
  people: "People",
};

export function generateStaticParams() {
  return Object.keys(SECTIONS).map((section) => ({ section }));
}

export default async function SectionPage({
  params,
}: PageProps<"/[section]">) {
  const { section } = await params;
  await requireAuth(`/${section}`);
  const title = SECTIONS[section];
  if (!title) notFound();

  return (
    <Shell>
      <header className="flex h-14 shrink-0 items-center px-5">
        <h1 className="text-sm font-medium">{title}</h1>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">
          {title} is not built yet.
        </p>
      </div>
    </Shell>
  );
}
