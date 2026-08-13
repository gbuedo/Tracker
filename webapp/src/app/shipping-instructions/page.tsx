import * as db from "@/lib/db";
import { ShippingInstructionsClient } from "@/components/ShippingInstructionsClient";

export const revalidate = 0; // Disable static caching for realtime updates

export default async function ShippingInstructionsPage() {
  const agents = await db.getOverseasAgents();

  return <ShippingInstructionsClient initialAgents={agents} />;
}
