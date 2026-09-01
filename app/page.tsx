import Builder from "@/components/Builder";
import { getCatalog, getRateCard } from "@/lib/storage";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; edit?: string }>;
}) {
  const [items, { from, edit }] = await Promise.all([getCatalog(), searchParams]);
  const initialSnapshot = edit ? await getRateCard(edit) : from ? await getRateCard(from) : null;

  return (
    <Builder
      initialItems={items}
      initialSnapshot={initialSnapshot}
      editId={edit && initialSnapshot ? edit : null}
    />
  );
}
