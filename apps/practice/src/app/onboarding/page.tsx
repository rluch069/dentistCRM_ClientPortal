import Link from "next/link";
import { OnboardingForm } from "@/components/onboarding-form";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-6 text-sm text-muted-foreground hover:underline">
        ← Back
      </Link>
      <OnboardingForm />
    </main>
  );
}
