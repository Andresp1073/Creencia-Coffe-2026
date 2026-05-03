import { NextRequest, NextResponse } from "next/server";
import { getProducts, getFeaturedProducts, getProductBySlug } from "@/lib/products/products.service";

export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.endsWith("/featured")) {
    const products = await getFeaturedProducts();
    return NextResponse.json(products);
  }

  const products = await getProducts();
  return NextResponse.json(products);
}