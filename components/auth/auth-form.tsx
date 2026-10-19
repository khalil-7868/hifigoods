"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AuthResult } from "@/app/(auth)/actions";

type Action = (prev: AuthResult, formData: FormData) => Promise<AuthResult>;

interface AuthFormProps {
  mode: "login" | "signup";
  action: Action;
  redirectTo?: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Please wait…" : label}
    </Button>
  );
}

export function AuthForm({ mode, action, redirectTo }: AuthFormProps) {
  const [state, formAction] = useActionState<AuthResult, FormData>(action, {});
  const isSignup = mode === "signup";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Truck className="size-6" aria-hidden />
        </div>
        <CardTitle className="text-xl">
          {isSignup ? "Create your account" : "Welcome back"}
        </CardTitle>
        <CardDescription>
          {isSignup
            ? "Start tracking your fleet's routes and profit."
            : "Sign in to your HiFiGoods dashboard."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4" noValidate>
          {redirectTo && (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          )}

          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                autoComplete="name"
                placeholder="Alex Driver"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder="••••••••"
              required
            />
          </div>

          {state.error && (
            <p
              role="alert"
              className="rounded-md bg-expense-muted px-3 py-2 text-sm text-expense"
            >
              {state.error}
            </p>
          )}
          {state.message && (
            <p
              role="status"
              className="rounded-md bg-profit-muted px-3 py-2 text-sm text-profit"
            >
              {state.message}
            </p>
          )}

          <SubmitButton label={isSignup ? "Create account" : "Sign in"} />
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isSignup ? "Already have an account? " : "New to HiFiGoods? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
