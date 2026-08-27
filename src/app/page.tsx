import { Header } from "@/components/ui/header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between">
      <Header />
      <div className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
      </div>
      <Footer />
    </main>
  );
}
