"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || profile.status !== "approved") {
    redirect("/");
  }

  return supabase;
}

async function updateRequest(userId: string, status: "approved" | "rejected") {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new Error("Identifiant de demande invalide.");
  }

  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("role", "user")
    .eq("status", "pending");

  if (error) {
    throw new Error("La demande n’a pas pu être mise à jour.");
  }

  revalidatePath("/admin/demandes");
}

export async function approveRequest(formData: FormData) {
  await updateRequest(String(formData.get("userId") ?? ""), "approved");
}

export async function rejectRequest(formData: FormData) {
  await updateRequest(String(formData.get("userId") ?? ""), "rejected");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
