import { NextRequest, NextResponse } from "next/server";
import { getProducts, getFeaturedProducts, getProductBySlug } from "@/lib/products/products.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.endsWith("/featured")) {
    const products = await getFeaturedProducts();
    return NextResponse.json(products, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  }

  const products = await getProducts();
  return NextResponse.json(products, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}