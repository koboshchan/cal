import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { requireUser, isAdmin } from "@/lib/auth";
import AdminSettingsForm from "./settings-form";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await requireUser();
  if (!(await isAdmin(user))) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-6 py-12">
        <h1 className="text-2xl font-semibold">Access restricted</h1>
        <p className="text-gray-600">This page is only for administrators. Your account is signed in but does not have admin access.</p>
        <Link href="/" className="inline-flex min-h-11 w-fit items-center rounded-lg border px-4 text-sm font-medium">Back to calendars</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Admin — LLM provider</h1>
      <AdminSettingsForm />
    </div>
  );
}
