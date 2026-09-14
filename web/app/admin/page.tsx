import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import type { UserDoc } from "@/lib/types";
import AdminSettingsForm from "./settings-form";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const db = await getDb();
  const user = await db.collection<UserDoc>("users").findOne({ clerkUserId: userId });
  if (user?.role !== "admin") redirect("/");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Admin — LLM provider</h1>
      <AdminSettingsForm />
    </div>
  );
}
