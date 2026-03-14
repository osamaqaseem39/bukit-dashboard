"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { ImageUpload } from "@/components/ui";
import {
  createClientWithUserApi,
  createLocationApi,
  createFacilityApi,
  getClientByIdApi,
  getLocationsApi,
  getFacilitiesApi,
  updateClientApi,
  updateLocationApi,
  updateFacilityApi,
  updateUserPasswordApi,
  type ClientDetail,
  type LocationPayload,
  type FacilityPayload,
  type UpdateClientPayload,
} from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";

const FACILITY_TYPE_LABELS: Record<string, string> = {
  "gaming-pc": "Gaming PC",
  vr: "VR",
  ps4: "PS4",
  ps5: "PS5",
  xbox: "XBOX",
  "snooker-table": "Snooker Table",
  "table-tennis-table": "Table Tennis Table",
  "futsal-field": "Futsal Field",
  "cricket-pitch": "Cricket Pitch",
  "padel-court": "Padel Court",
  other: "Other",
};

type WizardStep = 1 | 2 | 3;

interface StepErrorState {
  global?: string | null;
  fields: Record<string, string | null>;
}

const initialErrorState: StepErrorState = {
  global: null,
  fields: {},
};

export default function DashboardSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientIdFromQuery = searchParams.get("clientId");

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Step 1: Business information
  const [businessForm, setBusinessForm] = useState({
    companyName: "",
    legalName: "",
    contactName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    taxId: "",
    registrationNumber: "",
    description: "",
    logoUrl: "",
    coverImageUrl: "",
    adminPassword: "",
  });
  const [step1Errors, setStep1Errors] = useState<StepErrorState>(
    initialErrorState
  );

  // Step 2: Locations
  const [locations, setLocations] = useState<LocationPayload[]>([
    {
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
      phone: "",
      latitude: undefined,
      longitude: undefined,
      facility_types: [],
    },
  ]);
  const [step2Errors, setStep2Errors] = useState<StepErrorState>(
    initialErrorState
  );

  // Step 3: Facilities
  const [facilities, setFacilities] = useState<FacilityPayload[]>([
    {
      name: "",
      type: "other",
      status: "active",
      location_id: "",
      capacity: undefined,
    },
  ]);
  const [step3Errors, setStep3Errors] = useState<StepErrorState>(
    initialErrorState
  );

  const locationOptions = React.useMemo(
    () =>
      locations
        .filter((loc) => loc.id)
        .map((loc) => ({
          id: loc.id!,
          label: loc.name || "Unnamed location",
        })),
    [locations]
  );

  // Prefill when editing an existing business
  useEffect(() => {
    if (!clientIdFromQuery) return;

    const id = clientIdFromQuery as string;

    setIsEditing(true);
    setIsLoadingExisting(true);
    setLoadError(null);

    async function loadExisting() {
      try {
        const client: ClientDetail = await getClientByIdApi(id);
        const clientLocations = await getLocationsApi(id);

        setClientId(client.id);

        setBusinessForm((prev) => ({
          ...prev,
          companyName: client.company_name || "",
          contactName: client.contact_name || client.user?.name || "",
          email: client.email || client.user?.email || "",
          phone: client.phone || "",
          city: client.city || "",
          state: client.state || "",
          country: client.country || "",
          postalCode: client.postal_code || "",
          taxId: client.tax_id || "",
          registrationNumber: client.company_registration_number || "",
          description: client.description || "",
          logoUrl: client.logo_url || "",
          coverImageUrl: client.cover_image_url || "",
          latitude: client.latitude != null ? String(client.latitude) : "",
          longitude: client.longitude != null ? String(client.longitude) : "",
          adminPassword: "",
        }));

        if (clientLocations && clientLocations.length > 0) {
          const mapped: LocationPayload[] = clientLocations.map((loc) => ({
            id: loc.id,
            client_id: loc.client_id,
            name: loc.name,
            description: loc.description ?? undefined,
            phone: loc.phone ?? undefined,
            address: loc.address ?? undefined,
            city: loc.city ?? undefined,
            state: loc.state ?? undefined,
            country: loc.country ?? undefined,
            postal_code: loc.postal_code ?? undefined,
            latitude:
              loc.latitude != null
                ? (() => {
                    const num = Number(loc.latitude as any);
                    return isNaN(num) ? undefined : num;
                  })()
                : undefined,
            longitude:
              loc.longitude != null
                ? (() => {
                    const num = Number(loc.longitude as any);
                    return isNaN(num) ? undefined : num;
                  })()
                : undefined,
            facility_types: (loc as any).facility_types ?? [],
          }));
          setLocations(mapped);
          // Load existing facilities for this client's locations
          const allFacilities = await Promise.all(
            clientLocations.map((loc) =>
              getFacilitiesApi({ location_id: loc.id })
            )
          );
          const flat = allFacilities.flat();
          if (flat.length > 0) {
            setFacilities(
              flat.map((f) => ({
                id: f.id,
                location_id: f.location_id,
                name: f.name,
                type: f.type,
                status: f.status,
                capacity: f.capacity ?? undefined,
              }))
            );
          }
        }
      } catch (err: any) {
        setLoadError(err.message || "Failed to load existing business data");
      } finally {
        setIsLoadingExisting(false);
      }
    }

    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientIdFromQuery]);

  function goToStep(step: WizardStep) {
    // When editing, prevent navigation to step 2 if business hasn't been saved yet
    if (isEditing && step === 2 && !clientId) {
      setStep1Errors({
        global:
          "Please save the business information first before proceeding to locations.",
        fields: {},
      });
      return;
    }
    // Step 3 requires at least one location with id
    if (step === 3 && !locations.some((loc) => loc.id)) {
      setStep2Errors({
        global: "Save locations first so you can add facilities.",
        fields: {},
      });
      return;
    }
    setCurrentStep(step);
  }

  function handleBusinessChange(
    field: keyof typeof businessForm,
    value: string
  ) {
    setBusinessForm((prev) => ({ ...prev, [field]: value }));
    setStep1Errors((prev) => ({
      global: null,
      fields: { ...prev.fields, [field]: null },
    }));
  }

  function handleLocationChange(
    index: number,
    field: keyof LocationPayload,
    value: string
  ) {
    setLocations((prev) =>
      prev.map((loc, i) =>
        i === index
          ? {
              ...loc,
              [field]:
                field === "latitude" || field === "longitude"
                  ? value === ""
                    ? undefined
                    : (() => {
                        const num = Number(value);
                        if (isNaN(num)) return undefined;
                        // Validate ranges
                        if (field === "latitude" && (num < -90 || num > 90)) {
                          return undefined; // Invalid, but let validation catch it
                        }
                        if (
                          field === "longitude" &&
                          (num < -180 || num > 180)
                        ) {
                          return undefined; // Invalid, but let validation catch it
                        }
                        return num;
                      })()
                  : value,
            }
          : loc
      )
    );
    setStep2Errors((prev) => ({
      global: null,
      fields: { ...prev.fields, [`${index}.${field}`]: null },
    }));
  }

  function addLocation() {
    setLocations((prev) => [
      ...prev,
      {
        name: "",
        address: "",
        city: "",
        state: "",
        country: "",
        postal_code: "",
        phone: "",
        latitude: undefined,
        longitude: undefined,
        facility_types: [],
      },
    ]);
  }

  const GAMING_ZONE_CHILD_TYPES = [
    "gaming-pc",
    "vr",
    "ps5",
    "ps4",
    "xbox",
  ];

  const ARENA_CHILD_TYPES = ["futsal-field", "cricket-pitch", "padel-court"];

  function handleLocationFacilityTypesChange(
    index: number,
    type: string,
    checked: boolean
  ) {
    setLocations((prev) =>
      prev.map((loc, i) => {
        if (i !== index) return loc;
        const existing = loc.facility_types ?? [];
        let next: string[];

        if (type === "arena" || type === "gaming-zone") {
          const childTypes =
            type === "arena" ? ARENA_CHILD_TYPES : GAMING_ZONE_CHILD_TYPES;

          const hasAnyChild = childTypes.some((t) => existing.includes(t));

          if (checked && !hasAnyChild) {
            const updated = new Set(existing);
            childTypes.forEach((t) => updated.add(t));
            next = Array.from(updated);
          } else if (!checked && hasAnyChild) {
            next = existing.filter((t) => !childTypes.includes(t));
          } else {
            next = existing;
          }
        } else {
          if (checked) {
            if (existing.includes(type)) {
              next = existing;
            } else {
              next = [...existing, type];
            }
          } else {
            next = existing.filter((t) => t !== type);
          }
        }

        return {
          ...loc,
          facility_types: next,
        };
      })
    );
    setStep2Errors((prev) => ({
      global: null,
      fields: { ...prev.fields, [`${index}.facility_types`]: null },
    }));
  }

  function removeLocation(index: number) {
    if (locations.length > 1) {
      setLocations((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function handleFacilityChange(
    index: number,
    field: keyof FacilityPayload,
    value: string
  ) {
    setFacilities((prev) =>
      prev.map((fac, i) =>
        i === index
          ? {
              ...fac,
              [field]:
                field === "capacity"
                  ? value === ""
                    ? undefined
                    : Number(value)
                  : value,
            }
          : fac
      )
    );
    setStep3Errors((prev) => ({
      global: null,
      fields: { ...prev.fields, [`${index}.${field}`]: null },
    }));
  }

  function addFacility() {
    setFacilities((prev) => [
      ...prev,
      {
        name: "",
        type: "other",
        status: "active",
        location_id: locationOptions[0]?.id ?? "",
        capacity: undefined,
      },
    ]);
  }

  function removeFacility(index: number) {
    setFacilities((prev) => prev.filter((_, i) => i !== index));
  }

  function validateStep1(): boolean {
    const errors: StepErrorState = { global: null, fields: {} };

    if (!businessForm.companyName.trim()) {
      errors.fields.companyName = "Company name is required";
    }
    if (!businessForm.contactName.trim()) {
      errors.fields.contactName = "Contact person is required";
    }
    if (!businessForm.email.trim()) {
      errors.fields.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessForm.email)) {
      errors.fields.email = "Please enter a valid email address";
    }
    if (!businessForm.phone.trim()) {
      errors.fields.phone = "Phone is required";
    }
    if (!isEditing) {
      if (!businessForm.adminPassword.trim()) {
        errors.fields.adminPassword = "Admin password is required";
      } else if (businessForm.adminPassword.trim().length < 6) {
        errors.fields.adminPassword = "Password must be at least 6 characters";
      }
    } else {
      // When editing, password is optional but if provided, must be at least 6 characters
      if (
        businessForm.adminPassword.trim() &&
        businessForm.adminPassword.trim().length < 6
      ) {
        errors.fields.adminPassword = "Password must be at least 6 characters";
      }
    }

    if (Object.keys(errors.fields).length > 0) {
      errors.global = "Please fill in all required fields.";
      setStep1Errors(errors);
      return false;
    }

    setStep1Errors(initialErrorState);
    return true;
  }

  function validateStep2(): boolean {
    const errors: StepErrorState = { global: null, fields: {} };

    if (locations.length === 0) {
      errors.global = "Add at least one location to continue.";
    }

    locations.forEach((loc, index) => {
      if (!loc.name?.trim()) {
        errors.fields[`${index}.name`] = "Location name is required";
      }
      if (loc.latitude != null && (loc.latitude < -90 || loc.latitude > 90)) {
        errors.fields[`${index}.latitude`] = "Latitude must be between -90 and 90";
      }
      if (
        loc.longitude != null &&
        (loc.longitude < -180 || loc.longitude > 180)
      ) {
        errors.fields[`${index}.longitude`] =
          "Longitude must be between -180 and 180";
      }
    });

    if (Object.keys(errors.fields).length > 0 || errors.global) {
      if (!errors.global) {
        errors.global = "Please complete the required fields for locations.";
      }
      setStep2Errors(errors);
      return false;
    }

    setStep2Errors(initialErrorState);
    return true;
  }

  function validateStep3(): boolean {
    const errors: StepErrorState = { global: null, fields: {} };

    const hasAtLeastOneValid = facilities.some(
      (f) => f.name?.trim() && f.location_id?.trim()
    );
    if (!hasAtLeastOneValid) {
      errors.global = "Add at least one facility with name and location.";
    }

    facilities.forEach((fac, index) => {
      if (!fac.name?.trim()) {
        errors.fields[`${index}.name`] = "Facility name is required";
      }
      if (!fac.location_id?.trim()) {
        errors.fields[`${index}.location_id`] = "Location is required";
      }
    });

    if (Object.keys(errors.fields).length > 0 || errors.global) {
      setStep3Errors(errors);
      return false;
    }

    setStep3Errors(initialErrorState);
    return true;
  }

  async function handleSubmitStep1() {
    if (!validateStep1()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && clientIdFromQuery) {
        const payload: UpdateClientPayload = {
          company_name: businessForm.companyName,
          contact_name: businessForm.contactName || null,
          email: businessForm.email || null,
          phone: businessForm.phone || null,
          city: businessForm.city || null,
          state: businessForm.state || null,
          country: businessForm.country || null,
          postal_code: businessForm.postalCode || null,
          tax_id: businessForm.taxId || null,
          company_registration_number:
            businessForm.registrationNumber || null,
          description: businessForm.description || null,
          logo_url: businessForm.logoUrl || null,
          cover_image_url: businessForm.coverImageUrl || null,
        };

        await updateClientApi(clientIdFromQuery, payload);

        // Update password if provided
        if (
          businessForm.adminPassword &&
          businessForm.adminPassword.trim().length > 0
        ) {
          // Get the client to find user_id
          const client: ClientDetail = await getClientByIdApi(
            clientIdFromQuery
          );
          if ((client as any).user_id) {
            await updateUserPasswordApi(
              (client as any).user_id,
              businessForm.adminPassword
            );
          }
        }

        setClientId(clientIdFromQuery);
        setCurrentStep(2);
      } else {
        const payload = {
          user: {
            name:
              businessForm.contactName.trim() ||
              businessForm.companyName.trim() ||
              businessForm.email,
            email: businessForm.email,
            password: businessForm.adminPassword,
          },
          client: {
            company_name: businessForm.companyName,
            contact_name: businessForm.contactName,
            email: businessForm.email,
            phone: businessForm.phone,
            city: businessForm.city,
            state: businessForm.state || undefined,
            country: businessForm.country,
            postal_code: businessForm.postalCode || undefined,
            tax_id: businessForm.taxId || undefined,
            company_registration_number:
              businessForm.registrationNumber || undefined,
            description: businessForm.description || undefined,
            logo_url: businessForm.logoUrl || undefined,
            cover_image_url: businessForm.coverImageUrl || undefined,
          },
        };

        const result = await createClientWithUserApi(payload);

        // Use client.id because locations.client_id now references the Client entity
        const createdClientId =
          (result as any)?.client?.id ||
          (result as any)?.client_id ||
          (result as any)?.id;

        if (!createdClientId) {
          throw new Error("Client ID missing from response");
        }

        setClientId(createdClientId);
        setCurrentStep(2);
      }
    } catch (err: any) {
      setStep1Errors({
        global:
          err.message ||
          (isEditing ? "Failed to update business" : "Failed to create business"),
        fields: {},
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitStep2() {
    if (!clientId) {
      setStep2Errors({
        global:
          "Business has not been created yet. Please complete Step 1 first.",
        fields: {},
      });
      setCurrentStep(1);
      return;
    }

    if (!validateStep2()) return;

    setIsSubmitting(true);
    try {
      for (const loc of locations) {
        const payload: LocationPayload = {
          ...loc,
          client_id: clientId,
        };

        if (loc.id) {
          await updateLocationApi(loc.id, payload);
        } else {
          await createLocationApi(payload);
        }
      }

      // Refetch locations so we have ids for step 3 (facilities)
      const updatedLocations = await getLocationsApi(clientId);
      setLocations(
        updatedLocations.map((loc) => ({
          id: loc.id,
          client_id: loc.client_id,
          name: loc.name,
          description: loc.description ?? undefined,
          phone: loc.phone ?? undefined,
          address: loc.address ?? undefined,
          city: loc.city ?? undefined,
          state: loc.state ?? undefined,
          country: loc.country ?? undefined,
          postal_code: loc.postal_code ?? undefined,
          latitude:
            loc.latitude != null
              ? (() => {
                  const num = Number(loc.latitude as any);
                  return isNaN(num) ? undefined : num;
                })()
              : undefined,
          longitude:
            loc.longitude != null
              ? (() => {
                  const num = Number(loc.longitude as any);
                  return isNaN(num) ? undefined : num;
                })()
              : undefined,
          facility_types: (loc as any).facility_types ?? [],
        }))
      );
      setCurrentStep(3);
    } catch (err: any) {
      setStep2Errors({
        global: err.message || "Failed to save locations",
        fields: {},
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitStep3() {
    if (!validateStep3()) return;

    setIsSubmitting(true);
    try {
      const toSave = facilities.filter(
        (f) => f.name?.trim() && f.location_id?.trim()
      );
      for (const fac of toSave) {
        if (fac.id) {
          await updateFacilityApi(fac.location_id, fac.id, {
            name: fac.name,
            type: fac.type,
            status: fac.status,
            capacity: fac.capacity ?? null,
          });
        } else {
          await createFacilityApi({
            location_id: fac.location_id,
            name: fac.name,
            type: fac.type,
            status: fac.status,
            capacity: fac.capacity ?? null,
          });
        }
      }
      router.push("/dashboard");
    } catch (err: any) {
      setStep3Errors({
        global: err.message || "Failed to save facilities",
        fields: {},
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          {isEditing ? "Edit Business" : "Add New Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Step {currentStep} of 3 — Business information, locations, and
          facilities.
        </p>
        {isLoadingExisting && (
          <p className="mt-1 text-sm text-text-secondary">
            Loading existing business data...
          </p>
        )}
        {loadError && (
          <p className="mt-1 text-sm text-error">{loadError}</p>
        )}
      </div>

      {/* Stepper */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { step: 1, label: "Business Information" },
          { step: 2, label: "Locations" },
          { step: 3, label: "Facilities" },
        ].map((item) => {
          const isActive = currentStep === item.step;
          const isCompleted = currentStep > (item.step as number);
          // When editing, disable step 2 if business hasn't been saved
          const isDisabledStep2 = isEditing && item.step === 2 && !clientId;
          // Step 3 requires at least one location with id
          const isDisabledStep3 =
            item.step === 3 && !locations.some((loc) => loc.id);
          const isDisabled = isDisabledStep2 || isDisabledStep3;
          return (
            <div
              key={item.step}
              className={`rounded-lg border px-4 py-3 text-sm ${
                isActive
                  ? "border-primary bg-primary/5 text-primary"
                  : isCompleted
                  ? "border-success bg-success/5 text-success"
                  : isDisabled
                  ? "border-border bg-surface-elevated/30 text-text-tertiary cursor-not-allowed opacity-50"
                  : "border-border bg-surface-elevated/60 text-text-secondary cursor-pointer hover:bg-surface-elevated"
              }`}
              onClick={() => {
                if (!isDisabled) {
                  goToStep(item.step as WizardStep);
                }
              }}
            >
              <div className="font-medium">
                Step {item.step}: {item.label}
              </div>
              <div className="text-xs">
                {item.step === 1 &&
                  "Enter business profile and primary contact details."}
                {item.step === 2 &&
                  (isDisabledStep2
                    ? "Save business information first to proceed."
                    : "Add one or more branch locations for this business.")}
                {item.step === 3 &&
                  (isDisabledStep3
                    ? "Save locations first to add facilities."
                    : "Add facilities (courts, tables, zones) for each location.")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Business Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold tracking-tight text-text-primary">
              Step 1 — Business Information
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Enter the business profile and primary contact details.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {step1Errors.global && (
              <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-500">
                {step1Errors.global}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Company name *"
                placeholder="e.g. Bukit Gaming Lounge"
                value={businessForm.companyName}
                onChange={(e) =>
                  handleBusinessChange("companyName", e.target.value)
                }
                error={step1Errors.fields.companyName ?? undefined}
              />
              <Input
                label="Legal name"
                placeholder="Registered legal entity name"
                value={businessForm.legalName}
                onChange={(e) =>
                  handleBusinessChange("legalName", e.target.value)
                }
              />
              <Input
                label="Contact person *"
                placeholder="Primary contact person"
                value={businessForm.contactName}
                onChange={(e) =>
                  handleBusinessChange("contactName", e.target.value)
                }
                error={step1Errors.fields.contactName ?? undefined}
              />
              <Input
                label="Email *"
                type="email"
                placeholder="contact@business.com"
                value={businessForm.email}
                onChange={(e) =>
                  handleBusinessChange("email", e.target.value)
                }
                error={step1Errors.fields.email ?? undefined}
              />
              <Input
                label="Phone *"
                placeholder="+1 555 123 4567"
                value={businessForm.phone}
                onChange={(e) =>
                  handleBusinessChange("phone", e.target.value)
                }
                error={step1Errors.fields.phone ?? undefined}
              />
              <Input
                label={
                  isEditing ? "Change password (optional)" : "Admin password *"
                }
                type="password"
                placeholder={
                  isEditing
                    ? "Leave blank to keep current password"
                    : "Set an admin password for this business"
                }
                value={businessForm.adminPassword}
                onChange={(e) =>
                  handleBusinessChange("adminPassword", e.target.value)
                }
                error={step1Errors.fields.adminPassword ?? undefined}
              />
              <Input
                label="Tax ID"
                placeholder="Tax identification number"
                value={businessForm.taxId}
                onChange={(e) =>
                  handleBusinessChange("taxId", e.target.value)
                }
              />
              <Input
                label="Registration number"
                placeholder="Company registration number"
                value={businessForm.registrationNumber}
                onChange={(e) =>
                  handleBusinessChange("registrationNumber", e.target.value)
                }
              />
              <ImageUpload
                label="Logo"
                value={businessForm.logoUrl || undefined}
                onChange={(url) => handleBusinessChange("logoUrl", url)}
                variant="logo"
              />
              <ImageUpload
                label="Cover image"
                value={businessForm.coverImageUrl || undefined}
                onChange={(url) => handleBusinessChange("coverImageUrl", url)}
                variant="cover"
              />
            </div>
            <Input
              label="Description"
              placeholder="Short description of the business"
              value={businessForm.description}
              onChange={(e) =>
                handleBusinessChange("description", e.target.value)
              }
            />

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => router.push("/dashboard")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitStep1} disabled={isSubmitting}>
                {isSubmitting
                  ? isEditing
                    ? "Saving changes..."
                    : "Creating business..."
                  : "Save & continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Locations */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold tracking-tight text-text-primary">
              Step 2 — Locations
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Add one or more branch locations for this business. You can add
              multiple branches if your business operates in different
              locations.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {step2Errors.global && (
              <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-500">
                {step2Errors.global}
              </div>
            )}

            <div className="space-y-6">
              {locations.map((loc, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border-primary bg-surface-elevated/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-medium text-text-primary">
                      Branch {index + 1}
                    </div>
                    {locations.length > 1 && (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-red-500 hover:underline"
                        onClick={() => removeLocation(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Location name *"
                      placeholder="e.g. Downtown Branch"
                      value={loc.name}
                      onChange={(e) =>
                        handleLocationChange(index, "name", e.target.value)
                      }
                      error={
                        step2Errors.fields[`${index}.name`] ?? undefined
                      }
                    />
                    <Input
                      label="Phone"
                      placeholder="+1 555 123 4567"
                      value={loc.phone || ""}
                      onChange={(e) =>
                        handleLocationChange(index, "phone", e.target.value)
                      }
                    />
                    <Input
                      label="Address"
                      placeholder="Street and number"
                      value={loc.address || ""}
                      onChange={(e) =>
                        handleLocationChange(index, "address", e.target.value)
                      }
                    />
                    <Input
                      label="City"
                      placeholder="City"
                      value={loc.city || ""}
                      onChange={(e) =>
                        handleLocationChange(index, "city", e.target.value)
                      }
                    />
                    <Input
                      label="State / Region"
                      placeholder="State or region"
                      value={loc.state || ""}
                      onChange={(e) =>
                        handleLocationChange(index, "state", e.target.value)
                      }
                    />
                    <Input
                      label="Country"
                      placeholder="Country"
                      value={loc.country || ""}
                      onChange={(e) =>
                        handleLocationChange(index, "country", e.target.value)
                      }
                    />
                    <Input
                      label="Postal code"
                      placeholder="ZIP or postal code"
                      value={loc.postal_code || ""}
                      onChange={(e) =>
                        handleLocationChange(index, "postal_code", e.target.value)
                      }
                    />
                    <Input
                      label="Latitude"
                      placeholder="Between -90 and 90"
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      value={
                        typeof loc.latitude === "number"
                          ? String(loc.latitude)
                          : ""
                      }
                      onChange={(e) =>
                        handleLocationChange(index, "latitude", e.target.value)
                      }
                      error={
                        step2Errors.fields[`${index}.latitude`] ?? undefined
                      }
                    />
                    <Input
                      label="Longitude"
                      placeholder="Between -180 and 180"
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      value={
                        typeof loc.longitude === "number"
                          ? String(loc.longitude)
                          : ""
                      }
                      onChange={(e) =>
                        handleLocationChange(
                          index,
                          "longitude",
                          e.target.value
                        )
                      }
                      error={
                        step2Errors.fields[`${index}.longitude`] ?? undefined
                      }
                    />
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-text-secondary">
                        Facility types at this branch
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "gaming-zone",
                          "arena",
                          "snooker-table",
                          "table-tennis-table",
                          "other",
                        ].map((value) => {
                          const label =
                            value === "arena"
                              ? "Arena (Cricket, Futsal, Padel)"
                              : value === "gaming-zone"
                              ? "Gaming Zone"
                              : value === "snooker-table"
                              ? "Snooker"
                              : value === "table-tennis-table"
                              ? "Table Tennis"
                              : FACILITY_TYPE_LABELS[value] ?? value;

                          const facilityTypesForLoc = loc.facility_types ?? [];
                          const checked =
                            value === "arena"
                              ? ARENA_CHILD_TYPES.some((t) =>
                                  facilityTypesForLoc.includes(t)
                                )
                              : value === "gaming-zone"
                              ? GAMING_ZONE_CHILD_TYPES.some((t) =>
                                  facilityTypesForLoc.includes(t)
                                )
                              : facilityTypesForLoc.includes(value);

                          return (
                            <label
                              key={value}
                              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-text-secondary cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="h-3 w-3"
                                checked={checked}
                                onChange={(e) =>
                                  handleLocationFacilityTypesChange(
                                    index,
                                    value,
                                    e.target.checked
                                  )
                                }
                              />
                              <span>{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={addLocation}
                disabled={isSubmitting}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add another branch
              </Button>
            </div>

            <div className="mt-4 flex justify-between gap-2">
              <Button
                variant="secondary"
                onClick={() => goToStep(1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => router.push("/dashboard")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitStep2} disabled={isSubmitting}>
                  {isSubmitting ? "Saving locations..." : "Save & continue"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Facilities */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold tracking-tight text-text-primary">
              Step 3 — Facilities
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Add or edit facilities (courts, tables, zones, etc.) for each
              location. You can add more later from the sport-specific modules.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {step3Errors.global && (
              <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-500">
                {step3Errors.global}
              </div>
            )}

            {locationOptions.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No locations with IDs yet. Complete Step 2 first.
              </p>
            ) : (
              <>
                <div className="space-y-6">
                  {facilities.map((fac, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-border-primary bg-surface-elevated/60 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-medium text-text-primary">
                          Facility {index + 1}
                        </div>
                        {facilities.length > 1 && (
                          <button
                            type="button"
                            className="flex gap-1 text-xs text-red-500 hover:underline"
                            onClick={() => removeFacility(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Input
                          label="Name *"
                          placeholder="e.g. Gaming Zone A, Court 1"
                          value={fac.name}
                          onChange={(e) =>
                            handleFacilityChange(index, "name", e.target.value)
                          }
                          error={
                            step3Errors.fields[`${index}.name`] ?? undefined
                          }
                        />
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-secondary">
                            Type *
                          </label>
                          <select
                            className="w-full rounded-md border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                            value={fac.type}
                            onChange={(e) =>
                              handleFacilityChange(
                                index,
                                "type",
                                e.target.value
                              )
                            }
                          >
                            <option value="gaming-pc">Gaming — PC</option>
                            <option value="vr">Gaming — VR</option>
                            <option value="ps5">Gaming — PS5</option>
                            <option value="ps4">Gaming — PS4</option>
                            <option value="xbox">Gaming — XBOX</option>
                            <option value="snooker-table">Snooker table</option>
                            <option value="table-tennis-table">
                              Table tennis table
                            </option>
                            <option value="futsal-field">Futsal field</option>
                            <option value="cricket-pitch">Cricket pitch</option>
                            <option value="padel-court">Padel court</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-secondary">
                            Location *
                          </label>
                          <select
                            className="w-full rounded-md border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                            value={fac.location_id}
                            onChange={(e) =>
                              handleFacilityChange(
                                index,
                                "location_id",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Select a location</option>
                            {locationOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {step3Errors.fields[`${index}.location_id`] && (
                            <p className="mt-1 text-xs text-red-500">
                              {step3Errors.fields[`${index}.location_id`]}
                            </p>
                          )}
                        </div>

                        <Input
                          label="Capacity"
                          type="number"
                          placeholder="Optional"
                          value={
                            fac.capacity != null ? String(fac.capacity) : ""
                          }
                          onChange={(e) =>
                            handleFacilityChange(
                              index,
                              "capacity",
                              e.target.value
                            )
                          }
                        />

                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-secondary">
                            Status
                          </label>
                          <select
                            className="w-full rounded-md border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                            value={fac.status}
                            onChange={(e) =>
                              handleFacilityChange(
                                index,
                                "status",
                                e.target.value
                              )
                            }
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addFacility}
                    disabled={isSubmitting}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add another facility
                  </Button>
                </div>
              </>
            )}

            <div className="mt-4 flex justify-between gap-2">
              <Button
                variant="secondary"
                onClick={() => goToStep(2)}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => router.push("/dashboard")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitStep3} disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving facilities..."
                    : "Complete Setup"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

