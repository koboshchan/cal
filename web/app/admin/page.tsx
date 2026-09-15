import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { requireUser, isAdmin } from "@/lib/auth";
import AdminSettingsForm from "./settings-form";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await requireUser();
  if (!(await isAdmin(user))) redirect("/");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Admin — LLM provider</h1>
      <AdminSettingsForm />
    </div>
  );
}
