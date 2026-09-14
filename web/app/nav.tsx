import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { getDb } from "@/lib/mongodb";
import type { UserDoc } from "@/lib/types";

export default async function Nav() {
  const { userId } = await auth();

  let role: string | undefined;
  if (userId) {
    const db = await getDb();
    const user = await db
      .collection<UserDoc>("users")
      .findOne({ clerkUserId: userId });
    role = user?.role;
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b">
      <Link href="/" className="font-semibold">
        cal
      </Link>
      <nav className="flex items-center gap-4">
        {userId ? (
          <>
            {role === "admin" && (
              <Link href="/admin" className="text-sm text-gray-600">
                Admin
              </Link>
            )}
            <UserButton />
          </>
        ) : (
          <>
            <SignInButton mode="modal" />
            <SignUpButton mode="modal" />
          </>
        )}
      </nav>
    </header>
  );
}
