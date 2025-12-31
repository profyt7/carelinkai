/**
 * POST /api/discharge-planner/placement-request
 * Send placement request emails to selected homes
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import { Resend } from "resend";

const placementRequestSchema = z.object({
  searchId: z.string(),
  homeIds: z.array(z.string()).min(1, "Select at least one home"),
  patientInfo: z.object({
    name: z.string().optional(),
    age: z.number().optional(),
    gender: z.string().optional(),
    medicalNeeds: z.string(),
    timeline: z.string(),
    paymentType: z.string(),
    additionalNotes: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  console.log("📧 [PLACEMENT-REQUEST] Request received");

  try {
    // Require DISCHARGE_PLANNER role
    const user = await requireRole([UserRole.DISCHARGE_PLANNER, UserRole.ADMIN]);

    // Validate request
    const body = await request?.json?.();
    const validatedData = placementRequestSchema?.parse?.(body);
    const { searchId, homeIds, patientInfo } = validatedData ?? {};

    // Verify search exists
    const search = await prisma.placementSearch.findUnique({
      where: { id: searchId },
    });

    if (!search) {
      return NextResponse?.json?.(
        { error: "Search not found" },
        { status: 404 }
      );
    }

    // Get home details
    const homes = await prisma.assistedLivingHome.findMany({
      where: {
        id: { in: homeIds },
      },
      include: {
        address: true,
        operator: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!homes || homes.length === 0) {
      return NextResponse?.json?.(
        { error: "No homes found" },
        { status: 404 }
      );
    }

    console.log("📧 [PLACEMENT-REQUEST] Sending to ${homes?.length ?? 0} homes");

    // Initialize Resend
    const resend = new Resend(process.env?.RESEND_API_KEY);

    // Get discharge planner info
    const dpUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    const dpName = `${dpUser?.firstName ?? ""} ${dpUser?.lastName ?? ""}`?.trim?.() ?? "Discharge Planner";
    const dpEmail = dpUser?.email ?? "dischargeplanner@carelinkai.com";
    const dpPhone = dpUser?.phone ?? "Not provided";

    // Send emails and create placement request records
    const results = await Promise.all(
      (homes ?? [])?.map?.(async (home) => {
        try {
          const operatorEmail = home?.operator?.user?.email;
          const operatorName = `${home?.operator?.user?.firstName ?? ""} ${home?.operator?.user?.lastName ?? ""}`?.trim?.();

          if (!operatorEmail) {
            console.error("📧 [PLACEMENT-REQUEST] ❌ No email for home:", home.id);
            return {
              homeId: home.id,
              status: "FAILED",
              error: "No operator email",
            };
          }

          // Generate email content
          const emailSubject = `Urgent Placement Request - ${patientInfo?.timeline ?? "ASAP"}`;
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
                .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3b82f6; border-radius: 4px; }
                .label { font-weight: bold; color: #1f2937; }
                .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
                .urgent { background: #fef3c7; border-left-color: #f59e0b; padding: 10px; margin: 10px 0; border-radius: 4px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0;">Placement Request from ${dpName}</h2>
                  <p style="margin: 5px 0 0 0; opacity: 0.9;">Via CareLinkAI Discharge Planning Portal</p>
                </div>
                
                <div class="content">
                  <p>Dear ${operatorName || "Care Team"},</p>
                  
                  <p>We have an urgent placement request for <strong>${home.name}</strong>. Please review the patient information below and respond as soon as possible.</p>
                  
                  <div class="urgent">
                    <strong>🕒 Timeline: ${patientInfo?.timeline ?? "ASAP"}</strong>
                  </div>
                  
                  <div class="info-box">
                    <h3 style="margin-top: 0;">Patient Information</h3>
                    ${patientInfo?.name ? `<p><span class="label">Name:</span> ${patientInfo.name}</p>` : ""}
                    ${patientInfo?.age ? `<p><span class="label">Age:</span> ${patientInfo.age}</p>` : ""}
                    ${patientInfo?.gender ? `<p><span class="label">Gender:</span> ${patientInfo.gender}</p>` : ""}
                    <p><span class="label">Medical Needs:</span><br/>${patientInfo?.medicalNeeds ?? "Not specified"}</p>
                    <p><span class="label">Payment Type:</span> ${patientInfo?.paymentType ?? "Not specified"}</p>
                    ${patientInfo?.additionalNotes ? `<p><span class="label">Additional Notes:</span><br/>${patientInfo.additionalNotes}</p>` : ""}
                  </div>
                  
                  <div class="info-box">
                    <h3 style="margin-top: 0;">Discharge Planner Contact</h3>
                    <p><span class="label">Name:</span> ${dpName}</p>
                    <p><span class="label">Email:</span> <a href="mailto:${dpEmail}">${dpEmail}</a></p>
                    <p><span class="label">Phone:</span> ${dpPhone}</p>
                  </div>
                  
                  <p>Please respond to this email or call ${dpPhone} to discuss availability and next steps.</p>
                  
                  <p>Thank you for your prompt attention to this request.</p>
                  
                  <p>Best regards,<br/>${dpName}<br/>Discharge Planning Team</p>
                </div>
                
                <div class="footer">
                  <p>This is an automated message from CareLinkAI Discharge Planning Portal.</p>
                  <p>&copy; ${new Date().getFullYear()} CareLinkAI. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `;

          // Send email via Resend
          const emailResponse = await resend.emails.send({
            from: "CareLinkAI Discharge Planning <noreply@carelinkai.com>",
            to: operatorEmail,
            cc: dpEmail, // CC the discharge planner
            subject: emailSubject,
            html: emailHtml,
          });

          console.log("📧 [PLACEMENT-REQUEST] ✅ Email sent to:", operatorEmail, "ID:", emailResponse?.id);

          // Create placement request record
          const placementRequest = await prisma.placementRequest.create({
            data: {
              searchId,
              homeId: home.id,
              patientInfo,
              status: "SENT",
              emailSentAt: new Date(),
              emailDeliveryStatus: emailResponse?.id ? "DELIVERED" : "PENDING",
            },
          });

          return {
            homeId: home.id,
            homeName: home.name,
            status: "SUCCESS",
            placementRequestId: placementRequest.id,
            emailId: emailResponse?.id,
          };
        } catch (error: any) {
          console.error("📧 [PLACEMENT-REQUEST] ❌ Failed to send to:", home.id, error);
          
          // Still create a record but mark as failed
          try {
            const placementRequest = await prisma.placementRequest.create({
              data: {
                searchId,
                homeId: home.id,
                patientInfo,
                status: "PENDING",
                emailDeliveryStatus: "FAILED",
                notes: `Email failed: ${error?.message ?? "Unknown error"}`,
              },
            });
            
            return {
              homeId: home.id,
              homeName: home.name,
              status: "FAILED",
              error: error?.message ?? "Failed to send email",
              placementRequestId: placementRequest.id,
            };
          } catch (dbError) {
            return {
              homeId: home.id,
              homeName: home.name,
              status: "FAILED",
              error: error?.message ?? "Failed to send email",
            };
          }
        }
      }) ?? []
    );

    const successCount = results?.filter?.((r) => r?.status === "SUCCESS")?.length ?? 0;
    const failureCount = results?.filter?.((r) => r?.status === "FAILED")?.length ?? 0;

    console.log("📧 [PLACEMENT-REQUEST] ✅ Completed: ${successCount} success, ${failureCount} failed");

    return NextResponse?.json?.(
      {
        success: true,
        results,
        summary: {
          total: results?.length ?? 0,
          successful: successCount,
          failed: failureCount,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("📧 [PLACEMENT-REQUEST] ❌ Error:", error);
    return NextResponse?.json?.(
      { error: error?.message ?? "Failed to process placement request" },
      { status: 500 }
    );
  }
}
