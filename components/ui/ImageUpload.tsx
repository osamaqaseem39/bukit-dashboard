"use client";

import React, { useState, useMemo } from "react";
import { uploadImageApi, getApiBaseUrl } from "@/lib/api";

type ImageUploadVariant = "logo" | "cover" | "default";

interface ImageUploadProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  /** "logo" = square preview, full logo visible; "cover" = wide banner preview */
  variant?: ImageUploadVariant;
}

/** Resolve image URL to absolute so thumbnails load when backend returns e.g. /uploads/... */
function resolveImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = getApiBaseUrl().replace(/\/$/, "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

export default function ImageUpload({
  label,
  value,
  onChange,
  variant = "default",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useMemo(() => (value ? resolveImageUrl(value) : null), [value]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await uploadImageApi(file);
      onChange(res.url);
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const previewClass =
    variant === "logo"
      ? "h-28 w-28 rounded-lg border-2 border-border object-contain bg-surface-elevated"
      : variant === "cover"
        ? "w-full max-w-md aspect-[3/1] rounded-lg border-2 border-border object-cover bg-surface-elevated"
        : "h-28 w-40 rounded-md border-2 border-border object-cover bg-surface-elevated";

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {label}
        </p>
      )}
      {previewUrl && (
        <div className="mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">Preview</p>
          <img
            src={previewUrl}
            alt={label ? `${label} preview` : "Preview"}
            className={previewClass}
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="text-xs"
        />
        {uploading && (
          <span className="text-xs text-text-secondary">Uploading...</span>
        )}
      </div>
      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

