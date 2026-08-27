import { Header } from "@/components/ui/header";
import { UserEntryCard } from "@/components/onboarding/user-entry-card";
import { Footer } from "@/components/landing/footer";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50/50 dark:bg-slate-950/40">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <UserEntryCard />
      </main>
      <Footer />
    </div>
  );
}
