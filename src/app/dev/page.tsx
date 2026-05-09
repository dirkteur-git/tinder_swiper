/**
 * /dev — design-preview zonder login en zonder Supabase.
 * Gebruikt mock-candidates uit src/lib/mock-candidates.ts.
 *
 * Doel: snel kunnen beoordelen of de UI strak staat. Stemmen worden
 * lokaal in component-state gehouden — niets wordt naar de DB gestuurd.
 */
import { DevSwiperClient } from "@/components/DevSwiperClient";

export const dynamic = "force-static";

export default function DevPage() {
  return <DevSwiperClient />;
}
