export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { captureError } from '@/lib/sentry';

/**
 * GET /api/family/homes/compare?ids=id1,id2,id3
 * Returns comparison data for up to 3 care homes side by side.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 3); // max 3

    if (ids.length < 2) {
      return NextResponse.json({ error: "At least 2 home IDs required" }, { status: 400 });
    }

    const homes = await prisma.assistedLivingHome.findMany({
      where: { id: { in: ids }, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        description: true,
        careLevel: true,
        capacity: true,
        currentOccupancy: true,
        priceMin: true,
        priceMax: true,
        amenities: true,
        highlights: true,
        genderRestriction: true,
        address: {
          select: { city: true, state: true, zipCode: true },
        },
        photos: {
          take: 1,
          select: { url: true },
        },
        reviews: {
          select: { rating: true },
        },
        licenses: {
          where: { status: "ACTIVE" },
          select: { type: true, expirationDate: true },
        },
      },
    });

    const result = homes.map((home) => {
      const available = Math.max(0, home.capacity - home.currentOccupancy);
      const avgRating =
        home.reviews.length > 0
          ? home.reviews.reduce((sum, r) => sum + r.rating, 0) / home.reviews.length
          : null;

      return {
        id: home.id,
        name: home.name,
        description: home.description,
        careLevel: home.careLevel,
        capacity: home.capacity,
        availableBeds: available,
        priceMin: home.priceMin ? parseFloat(home.priceMin.toString()) : null,
        priceMax: home.priceMax ? parseFloat(home.priceMax.toString()) : null,
        amenities: home.amenities,
        highlights: home.highlights,
        genderRestriction: home.genderRestriction,
        location: home.address
          ? `${home.address.city}, ${home.address.state}`
          : "Location not listed",
        photoUrl: home.photos[0]?.url ?? null,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        reviewCount: home.reviews.length,
        activeLicenses: home.licenses.length,
      };
    });

    // Return in the requested order
    const ordered = ids
      .map((id) => result.find((h) => h.id === id))
      .filter(Boolean);

    return NextResponse.json({ success: true, homes: ordered });
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'family:homes:compare' },
    });
    console.error("[Compare API] Error:", error);
    return NextResponse.json({ error: "Failed to compare homes" }, { status: 500 });
  }
}
