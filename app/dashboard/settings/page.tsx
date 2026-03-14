"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { ImageUpload } from "@/components/ui";
import { Save, Building2, MapPin, CircleDot, Loader2, Plus, X } from "lucide-react";
import {
  getClientByUserIdApi,
  updateClientApi,
  getLocationsApi,
  updateLocationApi,
  getFacilitiesApi,
  updateFacilityApi,
  createFacilityForLocationApi,
  type ClientDetail,
  type Location,
  type Facility,
  type FacilityStatus,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

type SettingsTab = "business" | "locations" | "facilities";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("business");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Business settings
  const [businessData, setBusinessData] = useState<Partial<ClientDetail>>({});
  const [businessForm, setBusinessForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    tax_id: "",
    company_registration_number: "",
    description: "",
    logo_url: "",
    cover_image_url: "",
  });

  // Locations
  const [locations, setLocations] = useState<Location[]>([]);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState<Partial<Location>>({});

  // Facilities
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [editingFacility, setEditingFacility] = useState<string | null>(null);
  const [facilityForm, setFacilityForm] = useState<any>({});
  const [creatingFacilityForLocation, setCreatingFacilityForLocation] = useState<string | null>(null);
  const [newFacilityForm, setNewFacilityForm] = useState({
    name: "",
    type: "",
    status: "active" as FacilityStatus,
    capacity: undefined as number | undefined,
    // For gaming PCs: array of individual PC specs
    pcs: [] as {
      label: string;
      cpu: string;
      gpu: string;
      ram: string;
      refreshRate: string;
    }[],
    // For consoles
    screenSizeInches: "",
    gamesAvailable: "",
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      if (user.role === "client") {
        // Load client profile
        const client = await getClientByUserIdApi(user.id);
        setBusinessData(client);
        setBusinessForm({
          company_name: client.company_name || "",
          contact_name: client.contact_name || "",
          email: client.email || "",
          phone: client.phone || "",
          city: client.city || "",
          state: client.state || "",
          country: client.country || "",
          postal_code: client.postal_code || "",
          tax_id: client.tax_id || "",
          company_registration_number: client.company_registration_number || "",
          description: client.description || "",
          logo_url: client.logo_url || "",
          cover_image_url: client.cover_image_url || "",
        });

        // Load locations
        const locationsData = await getLocationsApi(user.id);
        setLocations(locationsData);

        // Load facilities - try general endpoint first, fallback to per-location
        try {
          const facilitiesData = await getFacilitiesApi({
            location_id: undefined, // Get all facilities for this client
          });
          setFacilities(facilitiesData);
        } catch (err) {
          // If general endpoint doesn't work, fetch facilities per location
          const allFacilities: Facility[] = [];
          for (const location of locationsData) {
            try {
              // Note: This requires a per-location endpoint
              // For now, we'll use the general endpoint with location_id filter
              const locFacilities = await getFacilitiesApi({
                location_id: location.id,
              });
              allFacilities.push(...locFacilities);
            } catch (e) {
              // Skip locations that fail
            }
          }
          setFacilities(allFacilities);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load settings data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBusiness() {
    if (!user || !businessData.id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        company_name: businessForm.company_name || null,
        contact_name: businessForm.contact_name || null,
        email: businessForm.email || null,
        phone: businessForm.phone || null,
        city: businessForm.city || null,
        state: businessForm.state || null,
        country: businessForm.country || null,
        postal_code: businessForm.postal_code || null,
        tax_id: businessForm.tax_id || null,
        company_registration_number: businessForm.company_registration_number || null,
        description: businessForm.description || null,
        logo_url: businessForm.logo_url || null,
        cover_image_url: businessForm.cover_image_url || null,
      };

      await updateClientApi(businessData.id, payload);
      setSuccess("Business settings updated successfully");
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update business settings");
    } finally {
      setSaving(false);
    }
  }

  function startEditLocation(location: Location) {
    setEditingLocation(location.id);
    setLocationForm({
      name: location.name,
      description: location.description || "",
      phone: location.phone || "",
      address: location.address || "",
      city: location.city || "",
      state: location.state || "",
      country: location.country || "",
      postal_code: location.postal_code || "",
    });
  }

  function cancelEditLocation() {
    setEditingLocation(null);
    setLocationForm({});
  }

  async function handleSaveLocation() {
    if (!editingLocation) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateLocationApi(editingLocation, locationForm);
      setSuccess("Location updated successfully");
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
      setEditingLocation(null);
      setLocationForm({});
    } catch (err: any) {
      setError(err.message || "Failed to update location");
    } finally {
      setSaving(false);
    }
  }

  function startEditFacility(facility: Facility) {
    setEditingFacility(facility.id);
    const metadata = facility.metadata || {};
    setFacilityForm({
      name: facility.name,
      type: facility.type,
      status: facility.status,
      capacity: facility.capacity || undefined,
      metadata,
      // Gaming PC units (if present)
      pcs: Array.isArray((metadata as any).pcs)
        ? (metadata as any).pcs.map((pc: any, index: number) => ({
            label: pc.label || `PC ${index + 1}`,
            cpu: pc.cpu || "",
            gpu: pc.gpu || "",
            ram: pc.ram || "",
            refreshRate:
              pc.refresh_rate_hz != null ? String(pc.refresh_rate_hz) : "",
          }))
        : [],
      screenSizeInches:
        (metadata as any).screen_size_inches != null
          ? String((metadata as any).screen_size_inches)
          : "",
      gamesAvailable: (metadata as any).games_available || "",
    });
  }

  function cancelEditFacility() {
    setEditingFacility(null);
    setFacilityForm({});
  }

  async function handleSaveFacility() {
    if (!editingFacility) return;

    const facility = facilities.find((f) => f.id === editingFacility);
    if (!facility) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const baseMetadata = facilityForm.metadata || {};
    const updatedMetadata: Record<string, any> = { ...baseMetadata };

    const type = (facilityForm.type || facility.type) as string;
    const screenSizeInches = facilityForm.screenSizeInches as string | undefined;
    const gamesAvailable = facilityForm.gamesAvailable as string | undefined;

    if (type === "gaming-pc") {
      // Replace legacy 'specs' with structured PCs array
      delete (updatedMetadata as any).specs;

      const pcs = (facilityForm as any).pcs || [];
      const pcsPayload = pcs
        .map((pc: any) => {
          const label = (pc.label || "").trim();
          const cpu = (pc.cpu || "").trim();
          const gpu = (pc.gpu || "").trim();
          const ram = (pc.ram || "").trim();
          const refreshRateStr = (pc.refreshRate || "").trim();
          const hasAny =
            label || cpu || gpu || ram || refreshRateStr;

          if (!hasAny) {
            return null;
          }

          const refresh_rate_hz = refreshRateStr
            ? Number(refreshRateStr)
            : undefined;

          return {
            label: label || undefined,
            cpu: cpu || undefined,
            gpu: gpu || undefined,
            ram: ram || undefined,
            refresh_rate_hz: !Number.isNaN(refresh_rate_hz)
              ? refresh_rate_hz
              : undefined,
          };
        })
        .filter(Boolean);

      if (pcsPayload.length) {
        (updatedMetadata as any).pcs = pcsPayload;
      } else {
        delete (updatedMetadata as any).pcs;
      }
    }

    if (type === "ps4" || type === "ps5" || type === "xbox") {
      if (screenSizeInches && screenSizeInches.trim()) {
        const num = Number(screenSizeInches);
        if (!Number.isNaN(num)) {
          updatedMetadata.screen_size_inches = num;
        }
      } else {
        delete updatedMetadata.screen_size_inches;
      }

      if (gamesAvailable && gamesAvailable.trim()) {
        updatedMetadata.games_available = gamesAvailable.trim();
      } else {
        delete updatedMetadata.games_available;
      }
    }

    const finalMetadata =
      Object.keys(updatedMetadata).length > 0 ? updatedMetadata : undefined;

    try {
      await updateFacilityApi(facility.location_id, editingFacility, {
        name: facilityForm.name,
        type: facilityForm.type,
        status: facilityForm.status,
        capacity: facilityForm.capacity,
        metadata: finalMetadata,
      });
      setSuccess("Facility updated successfully");
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
      setEditingFacility(null);
      setFacilityForm({});
    } catch (err: any) {
      setError(err.message || "Failed to update facility");
    } finally {
      setSaving(false);
    }
  }

  function startCreateFacility(locationId: string) {
    setCreatingFacilityForLocation(locationId);
    setNewFacilityForm({
      name: "",
      type: "",
      status: "active",
      capacity: undefined,
      pcs: [
        {
          label: "PC 1",
          cpu: "",
          gpu: "",
          ram: "",
          refreshRate: "",
        },
      ],
      screenSizeInches: "",
      gamesAvailable: "",
    });
  }

  function cancelCreateFacility() {
    setCreatingFacilityForLocation(null);
    setNewFacilityForm({
      name: "",
      type: "",
      status: "active",
      capacity: undefined,
      pcs: [
        {
          label: "PC 1",
          cpu: "",
          gpu: "",
          ram: "",
          refreshRate: "",
        },
      ],
      screenSizeInches: "",
      gamesAvailable: "",
    });
  }

  async function handleCreateFacility() {
    if (!creatingFacilityForLocation) return;

    if (!newFacilityForm.name || !newFacilityForm.type) {
      setError("Facility name and type are required");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const metadata: Record<string, any> = {};

    if (newFacilityForm.type === "gaming-pc") {
      const pcs = (newFacilityForm as any).pcs || [];
      const pcsPayload = pcs
        .map((pc: any) => {
          const label = (pc.label || "").trim();
          const cpu = (pc.cpu || "").trim();
          const gpu = (pc.gpu || "").trim();
          const ram = (pc.ram || "").trim();
          const refreshRateStr = (pc.refreshRate || "").trim();
          const hasAny =
            label || cpu || gpu || ram || refreshRateStr;

          if (!hasAny) {
            return null;
          }

          const refresh_rate_hz = refreshRateStr
            ? Number(refreshRateStr)
            : undefined;

          return {
            label: label || undefined,
            cpu: cpu || undefined,
            gpu: gpu || undefined,
            ram: ram || undefined,
            refresh_rate_hz: !Number.isNaN(refresh_rate_hz)
              ? refresh_rate_hz
              : undefined,
          };
        })
        .filter(Boolean);

      if (pcsPayload.length) {
        metadata.pcs = pcsPayload;
      }
    }

    if (
      newFacilityForm.type === "ps4" ||
      newFacilityForm.type === "ps5" ||
      newFacilityForm.type === "xbox"
    ) {
      if (newFacilityForm.screenSizeInches) {
        const num = Number(newFacilityForm.screenSizeInches);
        if (!Number.isNaN(num)) {
          metadata.screen_size_inches = num;
        }
      }
      if (newFacilityForm.gamesAvailable) {
        metadata.games_available = newFacilityForm.gamesAvailable.trim();
      }
    }

    try {
      await createFacilityForLocationApi(creatingFacilityForLocation, {
        name: newFacilityForm.name,
        type: newFacilityForm.type,
        status: newFacilityForm.status,
        capacity: newFacilityForm.capacity,
        metadata: Object.keys(metadata).length ? metadata : undefined,
      });
      setSuccess("Facility created successfully");
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
      cancelCreateFacility();
    } catch (err: any) {
      setError(err.message || "Failed to create facility");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== "client") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Settings are only available for client accounts
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your business settings, locations, and facilities
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("business")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "business"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300"
            }`}
          >
            <Building2 className="inline-block mr-2 h-4 w-4" />
            Business Settings
          </button>
          <button
            onClick={() => setActiveTab("locations")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "locations"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300"
            }`}
          >
            <MapPin className="inline-block mr-2 h-4 w-4" />
            Locations ({locations.length})
          </button>
          <button
            onClick={() => setActiveTab("facilities")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "facilities"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300"
            }`}
          >
            <CircleDot className="inline-block mr-2 h-4 w-4" />
            Facilities ({facilities.length})
          </button>
        </nav>
      </div>

      {/* Business Settings Tab */}
      {activeTab === "business" && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Business Information
            </h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Input
                label="Company Name *"
                value={businessForm.company_name}
                onChange={(e) =>
                  setBusinessForm({ ...businessForm, company_name: e.target.value })
                }
              />
              <Input
                label="Contact Name"
                value={businessForm.contact_name}
                onChange={(e) =>
                  setBusinessForm({ ...businessForm, contact_name: e.target.value })
                }
              />
              <Input
                label="Email *"
                type="email"
                value={businessForm.email}
                onChange={(e) =>
                  setBusinessForm({ ...businessForm, email: e.target.value })
                }
              />
              <Input
                label="Phone"
                type="tel"
                value={businessForm.phone}
                onChange={(e) =>
                  setBusinessForm({ ...businessForm, phone: e.target.value })
                }
              />
              <Input
                label="Tax ID"
                value={businessForm.tax_id}
                onChange={(e) =>
                  setBusinessForm({ ...businessForm, tax_id: e.target.value })
                }
              />
              <Input
                label="Registration Number"
                value={businessForm.company_registration_number}
                onChange={(e) =>
                  setBusinessForm({
                    ...businessForm,
                    company_registration_number: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <ImageUpload
                label="Logo"
                value={businessForm.logo_url || undefined}
                onChange={(url) =>
                  setBusinessForm({ ...businessForm, logo_url: url })
                }
                variant="logo"
              />
              <ImageUpload
                label="Cover image"
                value={businessForm.cover_image_url || undefined}
                onChange={(url) =>
                  setBusinessForm({
                    ...businessForm,
                    cover_image_url: url,
                  })
                }
                variant="cover"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1.5">
                Description
              </label>
              <textarea
                className="form-input"
                rows={4}
                value={businessForm.description}
                onChange={(e) =>
                  setBusinessForm({ ...businessForm, description: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveBusiness} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locations Tab */}
      {activeTab === "locations" && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Your Locations
            </h2>
          </CardHeader>
          <CardContent>
            {locations.length === 0 ? (
              <p className="text-sm text-text-secondary py-8 text-center">
                No locations found. Locations are created during business setup by administrators.
              </p>
            ) : (
              <div className="space-y-6">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="border border-border rounded-lg p-4"
                  >
                    {editingLocation === location.id ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input
                            label="Location Name *"
                            value={locationForm.name || ""}
                            onChange={(e) =>
                              setLocationForm({ ...locationForm, name: e.target.value })
                            }
                          />
                          <Input
                            label="Phone"
                            value={locationForm.phone || ""}
                            onChange={(e) =>
                              setLocationForm({ ...locationForm, phone: e.target.value })
                            }
                          />
                          <Input
                            label="Address"
                            value={locationForm.address || ""}
                            onChange={(e) =>
                              setLocationForm({
                                ...locationForm,
                                address: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1.5">
                            Description
                          </label>
                          <textarea
                            className="form-input"
                            rows={3}
                            value={locationForm.description || ""}
                            onChange={(e) =>
                              setLocationForm({
                                ...locationForm,
                                description: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            onClick={cancelEditLocation}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleSaveLocation} disabled={saving}>
                            {saving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-text-primary">
                              {location.name}
                            </h3>
                            <p className="mt-1 text-sm text-text-secondary">
                              {[
                                location.address,
                                location.city,
                                location.state,
                                location.country,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                            {location.description && (
                              <p className="mt-2 text-sm text-text-secondary">
                                {location.description}
                              </p>
                            )}
                            {location.phone && (
                              <p className="mt-1 text-sm text-text-secondary">
                                Phone: {location.phone}
                              </p>
                            )}
                          </div>
                            <Button
                              variant="secondary"
                              onClick={() => startEditLocation(location)}
                            >
                              Edit
                            </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Facilities Tab */}
      {activeTab === "facilities" && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-text-primary">
              Your Facilities
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Manage facilities for each location. You can add new facilities per location.
            </p>
          </CardHeader>
          <CardContent>
            {locations.length === 0 ? (
              <p className="text-sm text-text-secondary py-8 text-center">
                No locations found. Facilities can be added once locations are available.
              </p>
            ) : (
              <div className="space-y-8">
                {locations.map((location) => {
                  const locationFacilities = facilities.filter(
                    (f) => f.location_id === location.id
                  );
                  const isCreating = creatingFacilityForLocation === location.id;

                  return (
                    <div key={location.id} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-text-primary">
                            {location.name}
                          </h3>
                          <p className="text-sm text-text-secondary">
                            {locationFacilities.length} facility
                            {locationFacilities.length !== 1 ? "ies" : ""}
                          </p>
                        </div>
                        {!isCreating && (
                          <Button
                            variant="secondary"
                            onClick={() => startCreateFacility(location.id)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Facility
                          </Button>
                        )}
                      </div>

                      {/* Create Facility Form */}
                      {isCreating && (
                        <div className="border border-border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-text-primary">
                              Add New Facility to {location.name}
                            </h4>
                            <button
                              onClick={cancelCreateFacility}
                              className="text-text-secondary hover:text-text-primary"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <Input
                                label="Facility Name *"
                                value={newFacilityForm.name}
                                onChange={(e) =>
                                  setNewFacilityForm({
                                    ...newFacilityForm,
                                    name: e.target.value,
                                  })
                                }
                              />
                              <Input
                                label="Type *"
                                value={newFacilityForm.type}
                                onChange={(e) =>
                                  setNewFacilityForm({
                                    ...newFacilityForm,
                                    type: e.target.value,
                                  })
                                }
                                placeholder="e.g., gaming-pc, vr, ps5, futsal-field"
                              />
                              <Input
                                label="Capacity"
                                type="number"
                                min={0}
                                value={newFacilityForm.capacity || ""}
                                onChange={(e) =>
                                  setNewFacilityForm({
                                    ...newFacilityForm,
                                    capacity: Math.max(
                                      0,
                                      isNaN(parseInt(e.target.value))
                                        ? 0
                                        : parseInt(e.target.value),
                                    ),
                                  })
                                }
                              />
                              {newFacilityForm.type === "gaming-pc" && (
                                <div className="md:col-span-2 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-text-primary">
                                      PC units & specs
                                    </span>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() =>
                                        setNewFacilityForm({
                                          ...newFacilityForm,
                                          pcs: [
                                            ...newFacilityForm.pcs,
                                            {
                                              label: `PC ${newFacilityForm.pcs.length + 1}`,
                                              cpu: "",
                                              gpu: "",
                                              ram: "",
                                              refreshRate: "",
                                            },
                                          ],
                                        })
                                      }
                                    >
                                      <Plus className="mr-1 h-3 w-3" />
                                      Add PC
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {newFacilityForm.pcs.map((pc, index) => (
                                      <div
                                        key={index}
                                        className="grid gap-2 rounded-lg border border-border bg-white/70 p-3 md:grid-cols-5"
                                      >
                                        <Input
                                          label="Label"
                                          placeholder={`PC ${index + 1}`}
                                          value={pc.label}
                                          onChange={(e) => {
                                            const pcs = [...newFacilityForm.pcs];
                                            pcs[index] = {
                                              ...pcs[index],
                                              label: e.target.value,
                                            };
                                            setNewFacilityForm({
                                              ...newFacilityForm,
                                              pcs,
                                            });
                                          }}
                                        />
                                        <Input
                                          label="CPU"
                                          placeholder="e.g., i5 / i7"
                                          value={pc.cpu}
                                          onChange={(e) => {
                                            const pcs = [...newFacilityForm.pcs];
                                            pcs[index] = {
                                              ...pcs[index],
                                              cpu: e.target.value,
                                            };
                                            setNewFacilityForm({
                                              ...newFacilityForm,
                                              pcs,
                                            });
                                          }}
                                        />
                                        <Input
                                          label="GPU"
                                          placeholder="e.g., GTX 1660"
                                          value={pc.gpu}
                                          onChange={(e) => {
                                            const pcs = [...newFacilityForm.pcs];
                                            pcs[index] = {
                                              ...pcs[index],
                                              gpu: e.target.value,
                                            };
                                            setNewFacilityForm({
                                              ...newFacilityForm,
                                              pcs,
                                            });
                                          }}
                                        />
                                        <Input
                                          label="RAM"
                                          placeholder="e.g., 16GB"
                                          value={pc.ram}
                                          onChange={(e) => {
                                            const pcs = [...newFacilityForm.pcs];
                                            pcs[index] = {
                                              ...pcs[index],
                                              ram: e.target.value,
                                            };
                                            setNewFacilityForm({
                                              ...newFacilityForm,
                                              pcs,
                                            });
                                          }}
                                        />
                                        <div className="flex items-end gap-2">
                                          <Input
                                            label="Refresh (Hz)"
                                            type="number"
                                            placeholder="144"
                                            value={pc.refreshRate}
                                            onChange={(e) => {
                                              const pcs = [...newFacilityForm.pcs];
                                              pcs[index] = {
                                                ...pcs[index],
                                                refreshRate: e.target.value,
                                              };
                                              setNewFacilityForm({
                                                ...newFacilityForm,
                                                pcs,
                                              });
                                            }}
                                          />
                                          {newFacilityForm.pcs.length > 1 && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 flex items-center justify-center rounded-full"
                                              onClick={() => {
                                                const pcs = [...newFacilityForm.pcs];
                                                pcs.splice(index, 1);
                                                setNewFacilityForm({
                                                  ...newFacilityForm,
                                                  pcs,
                                                });
                                              }}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(newFacilityForm.type === "ps4" ||
                                newFacilityForm.type === "ps5" ||
                                newFacilityForm.type === "xbox") && (
                                <>
                                  <Input
                                    label="Screen size (inches)"
                                    type="number"
                                    value={newFacilityForm.screenSizeInches}
                                    onChange={(e) =>
                                      setNewFacilityForm({
                                        ...newFacilityForm,
                                        screenSizeInches: e.target.value,
                                      })
                                    }
                                  />
                                  <Input
                                    label="Games available"
                                    placeholder="e.g., FIFA, COD, GTA"
                                    value={newFacilityForm.gamesAvailable}
                                    onChange={(e) =>
                                      setNewFacilityForm({
                                        ...newFacilityForm,
                                        gamesAvailable: e.target.value,
                                      })
                                    }
                                  />
                                </>
                              )}
                              <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                  Status
                                </label>
                                <select
                                  className="form-input"
                                  value={newFacilityForm.status}
                                  onChange={(e) =>
                                    setNewFacilityForm({
                                      ...newFacilityForm,
                                      status: e.target.value as FacilityStatus,
                                    })
                                  }
                                >
                                  <option value="active">Active</option>
                                  <option value="inactive">Inactive</option>
                                  <option value="maintenance">Maintenance</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="secondary"
                                onClick={cancelCreateFacility}
                                disabled={saving}
                              >
                                Cancel
                              </Button>
                              <Button onClick={handleCreateFacility} disabled={saving}>
                                {saving ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Facility
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Facilities List for this Location */}
                      {locationFacilities.length === 0 && !isCreating ? (
                        <p className="text-sm text-text-secondary py-4 text-center">
                          No facilities yet. Click "Add Facility" to create one.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {locationFacilities.map((facility) => (
                            <div
                              key={facility.id}
                              className="border border-border rounded-lg p-4"
                            >
                              {editingFacility === facility.id ? (
                                <div className="space-y-4">
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <Input
                                      label="Facility Name *"
                                      value={facilityForm.name || ""}
                                      onChange={(e) =>
                                        setFacilityForm({
                                          ...facilityForm,
                                          name: e.target.value,
                                        })
                                      }
                                    />
                                    <Input
                                      label="Type"
                                      value={facilityForm.type || ""}
                                      onChange={(e) =>
                                        setFacilityForm({
                                          ...facilityForm,
                                          type: e.target.value,
                                        })
                                      }
                                    />
                                    <Input
                                      label="Capacity"
                                      type="number"
                                      min={0}
                                      value={facilityForm.capacity || ""}
                                      onChange={(e) =>
                                        setFacilityForm({
                                          ...facilityForm,
                                          capacity: Math.max(
                                            0,
                                            isNaN(parseInt(e.target.value))
                                              ? 0
                                              : parseInt(e.target.value),
                                          ),
                                        })
                                      }
                                    />
                                    {facilityForm.type === "gaming-pc" && (
                                      <div className="md:col-span-2 space-y-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium text-text-primary">
                                            PC units & specs
                                          </span>
                                          <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() =>
                                              setFacilityForm({
                                                ...facilityForm,
                                                pcs: [
                                                  ...(facilityForm.pcs || []),
                                                  {
                                                    label: `PC ${
                                                      (facilityForm.pcs || [])
                                                        .length + 1
                                                    }`,
                                                    cpu: "",
                                                    gpu: "",
                                                    ram: "",
                                                    refreshRate: "",
                                                  },
                                                ],
                                              })
                                            }
                                          >
                                            <Plus className="mr-1 h-3 w-3" />
                                            Add PC
                                          </Button>
                                        </div>
                                        <div className="space-y-2">
                                          {(facilityForm.pcs || []).map(
                                            (pc: any, index: number) => (
                                              <div
                                                key={index}
                                                className="grid gap-2 rounded-lg border border-border bg-white/70 p-3 md:grid-cols-5"
                                              >
                                                <Input
                                                  label="Label"
                                                  placeholder={`PC ${index + 1}`}
                                                  value={pc.label || ""}
                                                  onChange={(e) => {
                                                    const pcs = [
                                                      ...(facilityForm.pcs ||
                                                        []),
                                                    ];
                                                    pcs[index] = {
                                                      ...pcs[index],
                                                      label: e.target.value,
                                                    };
                                                    setFacilityForm({
                                                      ...facilityForm,
                                                      pcs,
                                                    });
                                                  }}
                                                />
                                                <Input
                                                  label="CPU"
                                                  placeholder="e.g., i5 / i7"
                                                  value={pc.cpu || ""}
                                                  onChange={(e) => {
                                                    const pcs = [
                                                      ...(facilityForm.pcs ||
                                                        []),
                                                    ];
                                                    pcs[index] = {
                                                      ...pcs[index],
                                                      cpu: e.target.value,
                                                    };
                                                    setFacilityForm({
                                                      ...facilityForm,
                                                      pcs,
                                                    });
                                                  }}
                                                />
                                                <Input
                                                  label="GPU"
                                                  placeholder="e.g., GTX 1660"
                                                  value={pc.gpu || ""}
                                                  onChange={(e) => {
                                                    const pcs = [
                                                      ...(facilityForm.pcs ||
                                                        []),
                                                    ];
                                                    pcs[index] = {
                                                      ...pcs[index],
                                                      gpu: e.target.value,
                                                    };
                                                    setFacilityForm({
                                                      ...facilityForm,
                                                      pcs,
                                                    });
                                                  }}
                                                />
                                                <Input
                                                  label="RAM"
                                                  placeholder="e.g., 16GB"
                                                  value={pc.ram || ""}
                                                  onChange={(e) => {
                                                    const pcs = [
                                                      ...(facilityForm.pcs ||
                                                        []),
                                                    ];
                                                    pcs[index] = {
                                                      ...pcs[index],
                                                      ram: e.target.value,
                                                    };
                                                    setFacilityForm({
                                                      ...facilityForm,
                                                      pcs,
                                                    });
                                                  }}
                                                />
                                                <div className="flex items-end gap-2">
                                                  <Input
                                                    label="Refresh (Hz)"
                                                    type="number"
                                                    placeholder="144"
                                                    value={pc.refreshRate || ""}
                                                    onChange={(e) => {
                                                      const pcs = [
                                                        ...(facilityForm.pcs ||
                                                          []),
                                                      ];
                                                      pcs[index] = {
                                                        ...pcs[index],
                                                        refreshRate:
                                                          e.target.value,
                                                      };
                                                      setFacilityForm({
                                                        ...facilityForm,
                                                        pcs,
                                                      });
                                                    }}
                                                  />
                                                  {(facilityForm.pcs || [])
                                                    .length > 1 && (
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-8 w-8 p-0 flex items-center justify-center rounded-full"
                                                      onClick={() => {
                                                        const pcs = [
                                                          ...(facilityForm.pcs ||
                                                            []),
                                                        ];
                                                        pcs.splice(index, 1);
                                                        setFacilityForm({
                                                          ...facilityForm,
                                                          pcs,
                                                        });
                                                      }}
                                                    >
                                                      <X className="h-4 w-4" />
                                                    </Button>
                                                  )}
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {(facilityForm.type === "ps4" ||
                                      facilityForm.type === "ps5" ||
                                      facilityForm.type === "xbox") && (
                                      <>
                                        <Input
                                          label="Screen size (inches)"
                                          type="number"
                                          value={facilityForm.screenSizeInches || ""}
                                          onChange={(e) =>
                                            setFacilityForm({
                                              ...facilityForm,
                                              screenSizeInches: e.target.value,
                                            })
                                          }
                                        />
                                        <Input
                                          label="Games available"
                                          placeholder="e.g., FIFA, COD, GTA"
                                          value={facilityForm.gamesAvailable || ""}
                                          onChange={(e) =>
                                            setFacilityForm({
                                              ...facilityForm,
                                              gamesAvailable: e.target.value,
                                            })
                                          }
                                        />
                                      </>
                                    )}
                                    <div>
                                      <label className="block text-sm font-medium text-text-primary mb-2">
                                        Status
                                      </label>
                                      <select
                                        className="form-input"
                                        value={facilityForm.status || "active"}
                                        onChange={(e) =>
                                          setFacilityForm({
                                            ...facilityForm,
                                            status: e.target.value as any,
                                          })
                                        }
                                      >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="maintenance">Maintenance</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="secondary"
                                      onClick={cancelEditFacility}
                                      disabled={saving}
                                    >
                                      Cancel
                                    </Button>
                                    <Button onClick={handleSaveFacility} disabled={saving}>
                                      {saving ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <Save className="mr-2 h-4 w-4" />
                                          Save
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-text-primary">
                                        {facility.name}
                                      </h4>
                                      <p className="mt-1 text-sm text-text-secondary">
                                        Type: {facility.type} | Status:{" "}
                                        <span
                                          className={`font-medium ${
                                            facility.status === "active"
                                              ? "text-green-600"
                                              : facility.status === "maintenance"
                                              ? "text-yellow-600"
                                              : "text-red-600"
                                          }`}
                                        >
                                          {facility.status}
                                        </span>
                                      </p>
                                      {facility.capacity && (
                                        <p className="mt-1 text-sm text-text-secondary">
                                          Capacity: {facility.capacity}
                                        </p>
                                      )}
                                    </div>
                                    <Button
                                      variant="secondary"
                                      onClick={() => startEditFacility(facility)}
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
