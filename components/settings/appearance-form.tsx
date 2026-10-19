"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function AppearanceForm() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes only knows the real value on the client; render a stable
  // skeleton first so server and client markup match.
  useEffect(() => setMounted(true), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Choose how HiFiGoods looks. System follows your device setting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="grid gap-3 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Theme"
        >
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = mounted && theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                  "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "border-primary bg-accent" : "border-border",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground",
                  )}
                  aria-hidden
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{opt.label}</span>
                  {opt.value === "system" && mounted && (
                    <span className="block text-xs text-muted-foreground">
                      Currently {resolvedTheme ?? "—"}
                    </span>
                  )}
                </span>
                {selected && (
                  <Check className="size-4 text-primary" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
