import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileText,
  MapPin,
  Receipt,
  Route as RouteIcon,
  ShieldCheck,
  Tag,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeatureCard } from "@/components/landing/feature-card";
import { getCurrentUser } from "@/lib/supabase/auth";
import { PATHS } from "@/lib/routes";

export const dynamic = "force-dynamic";

/** The marketing page is the one public surface — opt it back into indexing. */
export const metadata: Metadata = {
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: BarChart3,
    title: "Financial dashboard",
    description:
      "Profit, expenses, active vehicles, and net margin at a glance — with colorful charts filterable by day, week, month, or year.",
    accent: "violet" as const,
  },
  {
    icon: Truck,
    title: "Fleet management",
    description:
      "Register vehicles with plate, model, and status. Add or remove them in seconds.",
    accent: "sky" as const,
  },
  {
    icon: RouteIcon,
    title: "Route & trip tracking",
    description:
      "Log every trip with origin, destination, dates, and revenue — then see profit per route.",
    accent: "emerald" as const,
  },
  {
    icon: Receipt,
    title: "Expenses & receipts",
    description:
      "Add many expenses at once, tag them (Fuel, Lunch, custom), and attach image or PDF receipts.",
    accent: "rose" as const,
  },
  {
    icon: FileText,
    title: "Reports & print",
    description:
      "Filter summaries by vehicle and period, then print a clean, professional breakdown.",
    accent: "amber" as const,
  },
  {
    icon: ShieldCheck,
    title: "Secure & multi-user",
    description:
      "Row-level security keeps each account's data private. Manage your profile, photo, and password.",
    accent: "violet" as const,
  },
];

const COMING_SOON = [
  {
    icon: Tag,
    title: "Pricing plans",
    description:
      "Flexible tiers for owner-operators and growing fleets, with team seats and higher limits.",
    accent: "violet" as const,
  },
  {
    icon: MapPin,
    title: "Live vehicle tracking",
    description:
      "Real-time GPS locations, trip playback, and geofence alerts for your whole fleet.",
    accent: "emerald" as const,
  },
  {
    icon: Users,
    title: "Driver management",
    description:
      "Assign drivers to routes, track payouts, and share limited access with your team.",
    accent: "sky" as const,
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Truck className="size-5" aria-hidden />
            </span>
            HiFiGoods
          </Link>
          <nav className="flex items-center gap-2" aria-label="Primary">
            {user ? (
              <Button asChild>
                <Link href={PATHS.dashboard}>
                  Go to dashboard
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="glow-accent">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <Badge variant="secondary" className="mb-4">
            Goods transport, fully in control
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Track every trip, expense, and rupee of profit
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            HiFiGoods is a modern management app for goods transporters — manage
            your fleet, log routes and expenses with receipts, and see profit in
            PKR across beautiful, printable reports.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href={user ? "/dashboard" : "/signup"}>
                {user ? "Open dashboard" : "Start free"}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#features">Explore features</Link>
            </Button>
          </div>

          {/* Mock dashboard preview */}
          <div className="mx-auto mt-14 max-w-4xl rounded-2xl border bg-card p-4 shadow-xl">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: "Profit", v: "PKR 1.2M", t: "text-profit", a: "bg-profit/15" },
                { l: "Expenses", v: "PKR 640K", t: "text-expense", a: "bg-expense/15" },
                { l: "Vehicles", v: "12", t: "text-primary", a: "bg-primary/15" },
                { l: "Margin", v: "48.3%", t: "text-info", a: "bg-info/15" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border p-3 text-left">
                  <div className={`mb-2 size-8 rounded-lg ${s.a}`} aria-hidden />
                  <p className="text-xs text-muted-foreground">{s.l}</p>
                  <p className={`text-lg font-semibold tabular-nums ${s.t}`}>
                    {s.v}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex h-40 items-end gap-2 rounded-xl border bg-linear-to-b from-primary/5 to-transparent p-4">
              {[40, 65, 50, 80, 60, 90, 72, 96].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-linear-to-t from-primary/30 to-primary"
                  style={{ height: `${h}%` }}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Everything you need to run the numbers
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built for goods transport businesses — from a single truck to a full
            fleet.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* Coming soon */}
      <section className="border-t bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-3 bg-primary/15 text-primary" variant="secondary">
              On the roadmap
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">Coming soon</h2>
            <p className="mt-3 text-muted-foreground">
              We&apos;re just getting started. Here&apos;s what&apos;s next for
              HiFiGoods.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMING_SOON.map((f) => (
              <FeatureCard key={f.title} {...f} comingSoon />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="glow-accent relative overflow-hidden rounded-2xl border p-10 text-center">
          <TrendingUp
            className="mx-auto mb-4 size-10 text-primary"
            aria-hidden
          />
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to see your real profit?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Set up your fleet in minutes and start tracking today.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href={user ? "/dashboard" : "/signup"}>
              {user ? "Open dashboard" : "Create your account"}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Truck className="size-4" aria-hidden />
            <span>HiFiGoods</span>
          </div>
          <p>© {new Date().getFullYear()} HiFiGoods. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
