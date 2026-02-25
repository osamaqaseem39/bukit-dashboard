"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import LineChart from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
import PieChart from "@/components/charts/PieChart";
import {
  Booking,
  Facility,
  Location,
  getBookingsApi,
  getFacilitiesApi,
  getLocationsApi,
} from "@/lib/api";

const chartColors = [
  "rgb(var(--primary))",
  "rgb(var(--success))",
  "rgb(var(--warning))",
  "rgb(var(--error))",
];

export default function AnalyticsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [bookingsRes, facilitiesRes, locationsRes] = await Promise.all([
          getBookingsApi(),
          getFacilitiesApi(),
          getLocationsApi(),
        ]);

        if (!isMounted) return;

        setBookings(bookingsRes || []);
        setFacilities(facilitiesRes || []);
        setLocations(locationsRes || []);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to load analytics data");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const bookingsByMonth = useMemo(() => {
    const byMonth: Record<string, { month: string; bookings: number }> = {};

    bookings.forEach((b) => {
      const d = new Date(b.start_time);
      if (Number.isNaN(d.getTime())) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;

      if (!byMonth[key]) {
        byMonth[key] = { month: key, bookings: 0 };
      }

      byMonth[key].bookings += 1;
    });

    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  }, [bookings]);

  const facilitiesByType = useMemo(() => {
    const counts: Record<string, number> = {};

    facilities.forEach((f) => {
      const type = f.type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts).map(([type, count]) => ({
      name: type,
      count,
    }));
  }, [facilities]);

  const bookingsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};

    bookings.forEach((b) => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });

    return Object.entries(counts).map(([status, value]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value,
    }));
  }, [bookings]);

  const totalLocations = locations.length;
  const totalFacilities = facilities.length;
  const totalBookings = bookings.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Analytics</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Live insights across bookings, locations, and facilities.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* High-level stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-text-secondary">
              Total Locations
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">
              {totalLocations}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-text-secondary">
              Total Facilities
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">
              {totalFacilities}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-text-secondary">
              Total Bookings
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">
              {totalBookings}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bookings over time */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-text-primary">
            Bookings Over Time
          </h2>
        </CardHeader>
        <CardContent>
          <LineChart
            data={bookingsByMonth}
            dataKey="month"
            lines={[
              { key: "bookings", name: "Bookings", color: chartColors[1] },
            ]}
            height={400}
          />
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Facilities by Type
            </h2>
          </CardHeader>
          <CardContent>
            <BarChart
              data={facilitiesByType}
              dataKey="name"
              bars={[
                {
                  key: "count",
                  name: "Facilities",
                  color: chartColors[0],
                },
              ]}
              height={300}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Bookings by Status
            </h2>
          </CardHeader>
          <CardContent>
            <PieChart
              data={bookingsByStatus}
              colors={chartColors}
              height={300}
            />
          </CardContent>
        </Card>
      </div>

      {loading && (
        <p className="text-sm text-text-secondary">
          Loading analytics data...
        </p>
      )}
    </div>
  );
}
