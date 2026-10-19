import Link from "next/link";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PATHS } from "@/lib/routes";

/** 404 for anything outside the authenticated app shell. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Truck className="size-6" aria-hidden />
      </span>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          This page doesn&apos;t exist
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The link may be broken, or the page may have moved.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link href={PATHS.dashboard}>Go to dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
