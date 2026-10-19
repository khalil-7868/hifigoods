import Link from "next/link";
import { ArrowRight, Check, Receipt, Route as RouteIcon, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PATHS } from "@/lib/routes";

/**
 * First-run checklist, shown instead of the all-zeroes dashboard.
 *
 * A brand-new account otherwise lands on four "PKR 0" cards and an empty
 * chart — technically accurate, completely unhelpful. The steps are ordered by
 * the app's actual dependency chain: routes need a vehicle, expenses need a
 * route, so there's exactly one sensible next action at any point.
 *
 * It disappears for good once an expense exists; there's no dismiss button
 * because completing the work is the dismissal.
 */

interface Step {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: typeof Truck;
  done: boolean;
}

export function OnboardingChecklist({
  hasVehicles,
  hasRoutes,
  hasExpenses,
}: {
  hasVehicles: boolean;
  hasRoutes: boolean;
  hasExpenses: boolean;
}) {
  const steps: Step[] = [
    {
      title: "Add your first vehicle",
      description: "Plate number and model. Everything else hangs off this.",
      href: `${PATHS.vehicles}?new=1`,
      cta: "Add vehicle",
      icon: Truck,
      done: hasVehicles,
    },
    {
      title: "Log a trip",
      description:
        "Origin, destination and the rent agreed. Add legs if it's a multi-stage run.",
      href: `${PATHS.routes}?new=1`,
      cta: "Add route",
      icon: RouteIcon,
      done: hasRoutes,
    },
    {
      title: "Record expenses",
      description:
        "Open the trip and fill the expense sheet — diesel, toll, munshiana. Profit appears once you do.",
      href: PATHS.routes,
      cta: "Open routes",
      icon: Receipt,
      done: hasExpenses,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);

  return (
    <Card>
      <CardHeader className="gap-1 border-b">
        <CardTitle>Get set up</CardTitle>
        <p className="text-sm text-muted-foreground">
          {completed} of {steps.length} done — three steps and your dashboard
          starts showing real numbers.
        </p>
      </CardHeader>

      <CardContent className="pt-6">
        <ol className="space-y-1">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isNext = step === next;

            return (
              <li
                key={step.title}
                className={cn(
                  "flex items-start gap-3 rounded-lg p-3",
                  isNext && "bg-accent/50",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    step.done
                      ? "bg-profit text-profit-foreground"
                      : isNext
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground",
                  )}
                  aria-hidden
                >
                  {step.done ? <Check className="size-4" /> : i + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "font-medium",
                      step.done && "text-muted-foreground line-through",
                    )}
                  >
                    {step.title}
                    <span className="sr-only">
                      {step.done ? " — done" : ""}
                    </span>
                  </p>
                  {!step.done && (
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>

                {isNext && (
                  <Button size="sm" asChild className="shrink-0">
                    <Link href={step.href}>
                      <Icon aria-hidden />
                      {step.cta}
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
