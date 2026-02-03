import { redirect } from "next/navigation";

/**
 * Homepage redirects to Live Eval — the core feature.
 */
export default function Home() {
  redirect("/eval/live");
}
