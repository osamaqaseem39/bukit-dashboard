"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

const BOOKINGS_PATH = "/dashboard/bookings";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Location manager may only access Bookings; redirect any other path
  useEffect(() => {
    if (user?.role === "location_manager" && pathname !== BOOKINGS_PATH) {
      router.replace(BOOKINGS_PATH);
    }
  }, [user?.role, pathname, router]);

  return (
    <ProtectedRoute allowedRoles={["admin", "client", "location_manager"]}>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}
