import OrderFlow from "@/components/OrderFlow";
import { getCatalog, getHamperConfig, getRateCard, getSettings } from "@/lib/storage";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; edit?: string }>;
}) {
  const [items, hamperConfig, settings, { from, edit }] = await Promise.all([
    getCatalog(),
    getHamperConfig(),
    getSettings(),
    searchParams,
  ]);
  const initialSnapshot = edit ? await getRateCard(edit) : from ? await getRateCard(from) : null;

  return (
    <OrderFlow
      initialItems={items}
      initialHamperConfig={hamperConfig}
      initialTransportCost={settings.transportCost}
      initialSnapshot={initialSnapshot}
      editId={edit && initialSnapshot ? edit : null}
    />
  );
}
