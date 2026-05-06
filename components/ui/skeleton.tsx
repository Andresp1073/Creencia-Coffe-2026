"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-muted/50",
        className
      )}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-80 rounded-2xl bg-muted/50 mb-4" />
      <div className="h-6 w-3/4 bg-muted/50 rounded mb-2" />
      <div className="h-5 w-1/4 bg-muted/50 rounded" />
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="h-8 w-1/3 bg-muted/50 rounded mb-8" />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}