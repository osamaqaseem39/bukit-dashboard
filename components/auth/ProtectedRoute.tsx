"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"admin" | "client" | "user">;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      } else if (allowedRoles && !hasRole(allowedRoles)) {
        router.replace("/dashboard");
      }
    }
  }, [loading, isAuthenticated, allowedRoles, hasRole, router, pathname]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg border border-border bg-surface px-6 py-4 shadow-sm">
          <p className="text-sm text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && user && !hasRole(allowedRoles)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="max-w-md rounded-lg border border-border bg-surface px-6 py-5 text-center shadow-sm">
          <h2 className="text-base font-semibold text-text-primary">
            You don&apos;t have access to this page
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Your account is signed in, but your role is not allowed to view this
            section of the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

