import { redirect } from "next/navigation";

/**
 * Homepage redirects straight to the Arena.
 * This is a research/developer tool, not a consumer product.
 * The README is the "landing page" — GitHub visitors read that.
 */
export default function Home() {
  redirect("/arena");
}
