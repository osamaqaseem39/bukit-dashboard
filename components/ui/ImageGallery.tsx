"use client";

import React, { useRef, useState, useMemo } from "react";
import { uploadImageApi, getApiBaseUrl } from "@/lib/api";
import Button from "./Button";
import { Upload, Trash2, X } from "lucide-react";

interface ImageGalleryProps {
  label?: string;
  value?: string[];
  onChange: (urls: string[]) => void;
  /** Max number of images (default 12) */
  maxImages?: number;
}

function resolveImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = getApiBaseUrl().replace(/\/$/, "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

export default function ImageGallery({
  label,
  value = [],
  onChange,
  maxImages = 12,
}: ImageGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urls = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const canAdd = urls.length < maxImages;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canAdd) return;

    setUploading(true);
    setError(null);
    try {
      const res = await uploadImageApi(file);
      onChange([...urls, res.url]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
    setError(null);
  };

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {label}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {urls.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="relative group aspect-square w-24 rounded-lg border-2 border-border overflow-hidden bg-surface-elevated"
          >
            <img
              src={resolveImageUrl(url)}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 focus:outline-none"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {canAdd && (
          <div className="flex aspect-square w-24 items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface-elevated/60">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Add image"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="h-full w-full text-text-secondary hover:text-text-primary"
            >
              {uploading ? (
                <span className="text-xs">Uploading...</span>
              ) : (
                <Upload className="h-6 w-6" />
              )}
            </Button>
          </div>
        )}
      </div>
      {urls.length > 0 && (
        <p className="text-xs text-text-secondary">
          {urls.length} / {maxImages} images
        </p>
      )}
      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
