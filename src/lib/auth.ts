import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Use in Server Components that require authentication
// Redirects to /login if no valid session
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return user;
}

// Use when you need user but want to handle unauthenticated state yourself
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
