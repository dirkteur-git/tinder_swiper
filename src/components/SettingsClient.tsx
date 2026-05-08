"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Github,
  Hand,
  HelpCircle,
  Info,
  LogOut,
  Mail,
  Smartphone
} from "lucide-react";
import { BrandWordmark } from "./BrandWordmark";
import { useHandedness, setHandedness } from "@/lib/handedness";

interface Props {
  userEmail: string;
  userId: string;
  lastSignIn: string | null;
}

export function SettingsClient({ userEmail, userId, lastSignIn }: Props) {
  const [installPromptShown, setInstallPromptShown] = useState(false);
  const handedness = useHandedness();

  const isStandalone =
    typeof window !== "undefined" &&
    window.matchMedia?.("(display-mode: standalone)").matches;

  return (
    <div className="min-h-[100dvh] bg-bg pb-12">
      <header className="safe-top safe-x sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-bg/95 pb-3 backdrop-blur">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 active:scale-95"
          aria-label="Terug"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-vondr-dark-blue">
            Instellingen
          </h1>
        </div>
      </header>

      <main className="space-y-vondr-l px-vondr-m pt-vondr-l">
        <Group title="Account">
          <Row icon={<Mail size={16} />} label="Ingelogd als">
            <span className="font-mono text-sm text-vondr-dark-blue">
              {userEmail}
            </span>
          </Row>
          {lastSignIn && (
            <Row icon={<Info size={16} />} label="Laatste login">
              <span className="text-sm text-ink-700">
                {formatDate(lastSignIn)}
              </span>
            </Row>
          )}
          <Row icon={<Info size={16} />} label="User-id">
            <span className="font-mono text-[11px] text-ink-500">
              {userId.slice(0, 8)}...
            </span>
          </Row>
          <div className="border-t border-line p-3">
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-vondr-l bg-accent-no/[0.06] py-3 text-sm font-semibold text-accent-no ring-1 ring-accent-no/25 active:scale-[0.98]"
              >
                <LogOut size={14} />
                Uitloggen
              </button>
            </form>
          </div>
        </Group>

        <Group title="App">
          <Row icon={<Smartphone size={16} />} label="Modus">
            <span className="text-sm text-ink-700">
              {isStandalone ? "Geïnstalleerd (PWA)" : "In browser"}
            </span>
          </Row>

          <div className="border-t border-line p-3">
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 text-ink-400">
                <Hand size={16} />
              </span>
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                  Voorkeurshand
                </div>
                <p className="mt-0.5 text-[11px] text-ink-400">
                  {handedness === "left"
                    ? "Linkshandig — sleep links voor JA"
                    : "Rechtshandig — sleep rechts voor JA"}
                </p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => setHandedness("right")}
                className={`rounded-vondr-l py-2 text-sm font-semibold transition active:scale-[0.98] ${
                  handedness === "right"
                    ? "bg-vondr-dark-blue text-white"
                    : "bg-bg text-ink-700 ring-1 ring-line"
                }`}
              >
                Rechts → JA
              </button>
              <button
                onClick={() => setHandedness("left")}
                className={`rounded-vondr-l py-2 text-sm font-semibold transition active:scale-[0.98] ${
                  handedness === "left"
                    ? "bg-vondr-dark-blue text-white"
                    : "bg-bg text-ink-700 ring-1 ring-line"
                }`}
              >
                Links → JA
              </button>
            </div>
          </div>
          {!isStandalone && (
            <div className="border-t border-line p-3">
              <button
                onClick={() => setInstallPromptShown((s) => !s)}
                className="w-full rounded-vondr-l bg-vondr-pop py-3 text-sm font-semibold text-white active:scale-[0.98]"
              >
                Installeer op telefoon
              </button>
              {installPromptShown && (
                <div className="mt-3 rounded-vondr-l bg-bg p-3 text-xs leading-relaxed text-ink-700 ring-1 ring-line">
                  <strong>iPhone (Safari):</strong> tap het deel-icoon
                  onderin → &ldquo;Zet op beginscherm&rdquo;.
                  <br />
                  <strong>Android (Chrome):</strong> menu (3 puntjes) →
                  &ldquo;App installeren&rdquo; of &ldquo;Toevoegen aan
                  beginscherm&rdquo;.
                </div>
              )}
            </div>
          )}
        </Group>

        <Group title="Over">
          <Row
            icon={<Info size={16} />}
            label="Wat is dit?"
            stack
            value="Vondr Swiper is jouw beslis-tool voor het collectieve geheugen van vondr. MegaVondr leest gesprekken uit en haalt er suggesties uit (vragen, regels, feiten, risico's). Jij en de andere founder beoordelen ze: rechts = ja (toevoegen), links = nee (afwijzen), omhoog = pas (bespreken). Suggesties zijn gegroepeerd per categorie. Pas als jullie het eens zijn over een suggestie wordt 'ie definitief opgenomen — anders gaat 'ie naar een afstem-categorie."
          />
          <Row icon={<HelpCircle size={16} />} label="Hulp">
            <a
              href="mailto:dirk@vondr.ai"
              className="text-sm text-vondr-pop underline-offset-2 hover:underline"
            >
              dirk@vondr.ai
            </a>
          </Row>
          <Row icon={<Github size={16} />} label="Code">
            <a
              href="https://github.com/dirkteur-git/vondr_swiper"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-vondr-pop underline-offset-2 hover:underline"
            >
              github.com/...vondr_swiper
            </a>
          </Row>
        </Group>

        <div className="pt-vondr-l text-center">
          <BrandWordmark height={20} className="opacity-50" />
          <p className="mt-2 text-[11px] text-ink-400">
            Een gids heeft altijd een plan.
          </p>
        </div>
      </main>
    </div>
  );
}

function Group({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {title}
      </h2>
      <div className="overflow-hidden rounded-vondr-l bg-surface ring-1 ring-line">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  children,
  value,
  stack
}: {
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
  value?: string;
  stack?: boolean;
}) {
  if (stack) {
    return (
      <div className="border-b border-line p-3 last:border-b-0">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          <span className="text-ink-400">{icon}</span>
          {label}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
          {value}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 border-b border-line p-3 last:border-b-0">
      <div className="flex-shrink-0 text-ink-400">{icon}</div>
      <div className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {label}
      </div>
      <div className="min-w-0 truncate text-right">{children}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${h}:${m}`;
}
