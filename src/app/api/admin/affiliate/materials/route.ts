export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** POST /api/admin/affiliate/materials — admin uploads a new marketing asset */
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAnyRole(["ADMIN"] as any);
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const category = formData.get("category") as string;

    if (!file || !title || !category) {
      return NextResponse.json({ error: "file, title, and category are required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: "carelinkai/affiliate-materials",
      resource_type: "auto",
      public_id: `${category}-${Date.now()}`,
    });

    const material = await prisma.affiliateMaterial.create({
      data: {
        title,
        description: description ?? undefined,
        category,
        fileUrl: result.secure_url,
        fileType: file.type.split("/")[1] ?? "pdf",
      },
    });

    return NextResponse.json({ success: true, material });
  } catch (error) {
    console.error("[Admin Affiliate Materials] POST error:", error);
    return NextResponse.json({ error: "Failed to upload material" }, { status: 500 });
  }
}

/** DELETE /api/admin/affiliate/materials?id=xxx — deactivate a material */
export async function DELETE(request: NextRequest) {
  try {
    const { error } = await requireAnyRole(["ADMIN"] as any);
    if (error) return error;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.affiliateMaterial.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Affiliate Materials] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete material" }, { status: 500 });
  }
}
