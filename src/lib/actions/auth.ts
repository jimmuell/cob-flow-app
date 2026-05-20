"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth/session";

export async function signInAction(formData: FormData): Promise<void> {
  const userId = formData.get("userId") as string | null;
  const email = formData.get("email") as string | null;
  const identifier = userId?.trim() || email?.trim() || "";

  try {
    await signIn(identifier, "");
  } catch {
    redirect(`/signin?error=${encodeURIComponent("Invalid credentials")}`);
  }

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/signin");
}
