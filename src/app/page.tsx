import { NavigationBar } from "@/components/site/NavigationBar";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { HeroSection } from "@/components/site/HeroSection";
import { LivingOceanSection } from "@/components/site/LivingOceanSection";
import { InteractionSection } from "@/components/site/InteractionSection";
import { BeneathSurfaceSection } from "@/components/site/BeneathSurfaceSection";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white">
      {/* Skip link for keyboard users */}
      <a
        href="#main"
        className="sr-only z-[90] rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <ScrollProgress />
      <NavigationBar />

      <main id="main" className="flex-1">
        <HeroSection />
        <LivingOceanSection />
        <InteractionSection />
        <BeneathSurfaceSection />
      </main>

      <SiteFooter />
    </div>
  );
}
