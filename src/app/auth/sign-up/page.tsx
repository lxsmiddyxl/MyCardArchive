"use client";

import { SignupForm } from "@/components/auth/signup-form";
import { Suspense } from "react";

export default function AuthSignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl text-center text-sm text-mca-ink-subtle dark:border-mca-border-subtle">
          Loading...
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
