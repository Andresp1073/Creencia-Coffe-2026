export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  categorySlug?: string;
  presentation: "500g" | "250g" | "125g";
  price: number;
  price_500g?: number;
  price_250g?: number;
  price_125g?: number;
  image?: string;
  description?: string;
  featured?: boolean;
  active?: boolean;
  stock?: number;
  availablePresentations?: ("500g" | "250g" | "125g")[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}