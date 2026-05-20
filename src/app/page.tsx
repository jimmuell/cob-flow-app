import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

// Defense-in-depth: middleware already redirects unauthenticated requests,
// but this ensures correctness if middleware is bypassed or misconfigured.
export default async function RootPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/signin");
  }
}
