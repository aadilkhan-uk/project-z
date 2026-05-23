import { redirect } from "next/navigation";

/**
 * `/dashboard` is the historical post-OAuth landing route. The transactions
 * explorer now lives at `/transactions`, so we forward users there.
 */
export default function Dashboard() {
  redirect("/transactions");
}
