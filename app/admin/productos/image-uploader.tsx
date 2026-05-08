"use client";

import { useState, useRef, useCallback, DragEvent } from "react";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  defaultImage?: string;
  maxSizeMB?: number;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB_DEFAULT = 5;

export function ImageUploader({
  value,
  onChange,
  defaultImage,
  maxSizeMB = MAX_SIZE_MB_DEFAULT,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayImage = value || defaultImage;
  const hasImage = !!displayImage;

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Formato no soportado. Usa: JPG, PNG, WebP`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `La imagen es muy grande. Máximo ${maxSizeMB}MB`;
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      } else {
        throw new Error("Error subiendo imagen");
      }
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }

        setError(null);
        setIsUploading(true);

        const formData = new FormData();
        formData.append("file", file);

        fetch("/api/admin/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        })
          .then((res) => (res.ok ? res.json() : Promise.reject()))
          .then((data) => onChange(data.url))
          .catch(() => {
            const reader = new FileReader();
            reader.onloadend = () => onChange(reader.result as string);
            reader.readAsDataURL(file);
          })
          .finally(() => setIsUploading(false));
      }
    },
    [onChange]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div
        onClick={hasImage ? undefined : handleClick}
        onDragEnter={hasImage ? undefined : handleDragEnter}
        onDragLeave={hasImage ? undefined : handleDragLeave}
        onDragOver={hasImage ? undefined : handleDragOver}
        onDrop={hasImage ? undefined : handleDrop}
        className={cn(
          "relative aspect-square rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden cursor-pointer",
          hasImage
            ? "border-transparent cursor-default"
            : isDragging
            ? "border-brand-caramel bg-brand-caramel/5 scale-[1.02]"
            : "border-border/60 hover:border-brand-caramel/50 hover:bg-muted/50",
          error && !hasImage && "border-red-500 bg-red-50/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80">
            <div className="size-10 border-3 border-brand-caramel/30 border-t-brand-caramel rounded-full animate-spin mb-3" />
            <span className="text-sm text-muted-foreground">Subiendo...</span>
          </div>
        ) : hasImage ? (
          <div className="relative w-full h-full group">
            <img
              src={displayImage}
              alt="Imagen del producto"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                type="button"
                onClick={handleClick}
                className="size-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-coffee-dark shadow-lg transition-transform hover:scale-110 active:scale-95"
              >
                <Upload className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="size-10 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            <div
              className={cn(
                "size-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                isDragging ? "bg-brand-caramel/20" : "bg-muted"
              )}
            >
              {isDragging ? (
                <ImageIcon className="size-8 text-brand-caramel" />
              ) : (
                <Upload
                  className={cn(
                    "size-8",
                    error ? "text-red-500" : "text-muted-foreground"
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "text-sm font-medium text-center mb-1",
                error ? "text-red-600" : "text-foreground"
              )}
            >
              {error ? "Error" : "Subir imagen"}
            </span>
            <span className="text-xs text-muted-foreground text-center">
              {isDragging
                ? "Suelta aquí"
                : `Click o arrastra • JPG, PNG, WebP • Máx ${maxSizeMB}MB`}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {hasImage && !value && (
        <button
          type="button"
          onClick={handleRemove}
          className="text-xs text-muted-foreground hover:text-red-600 transition-colors flex items-center gap-1"
        >
          <X className="size-3" /> Quitar imagen
        </button>
      )}
    </div>
  );
}