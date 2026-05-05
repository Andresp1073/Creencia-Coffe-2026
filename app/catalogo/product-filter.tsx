"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const presentations = [
  { value: "todos", label: "Todos" },
  { value: "500g", label: "500 GRS" },
  { value: "250g", label: "250 GRS" },
  { value: "125g", label: "125 GRS" },
];

export function ProductFilter({ active }: { active: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "todos") {
      params.delete("presentation");
    } else {
      params.set("presentation", value);
    }
    router.push(`/catalogo?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {presentations.map((p) => (
        <button
          key={p.value}
          onClick={() => handleFilter(p.value)}
          className={cn(
            "px-4 py-2 rounded-full text-sm transition-smooth border",
            active === p.value
              ? "bg-coffee-dark text-cream border-coffee-dark"
              : "bg-transparent border-border text-foreground/70 hover:border-coffee-medium hover:text-coffee-dark"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}