import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { inquiryResponseGenerator } from '@/lib/ai/inquiry-response-generator';
import { inquiryEmailService } from '@/lib/email/inquiry-email-service';
import { prisma } from '@/lib/prisma';

// Tell Next.js this route is fully dynamic - prevents build-time execution
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authorization
    if (!session?.user || !['ADMIN', 'OPERATOR'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const {
      type = 'INITIAL',
      tone,
      includeNextSteps = true,
      includeHomeDetails = true,
      sendEmail = false,
    } = body;
    
    // Generate AI response
    const content = await inquiryResponseGenerator.generateResponseForInquiry(
      params.id,
      {
        type,
        tone,
        includeNextSteps,
        includeHomeDetails,
      }
    );
    
    // Save response to database
    const response = await prisma.inquiryResponse.create({
      data: {
        inquiryId: params.id,
        content,
        type: 'AI_GENERATED',
        channel: 'EMAIL',
        sentBy: session.user.id,
        status: sendEmail ? 'SENT' : 'DRAFT',
        sentAt: sendEmail ? new Date() : null,
        metadata: {
          aiModel: 'gpt-4',
          responseType: type,
          tone,
        },
      },
    });
    
    // Send email if requested
    if (sendEmail) {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id: params.id },
      });
      
      if (inquiry) {
        const emailSent = await inquiryEmailService.sendInquiryResponse(
          inquiry.contactEmail!,
          inquiry.contactName!,
          content,
          inquiry.id
        );
        
        if (emailSent) {
          // Update inquiry status
          await prisma.inquiry.update({
            where: { id: params.id },
            data: { status: 'CONTACTED' },
          });
          
          // Update response status
          await prisma.inquiryResponse.update({
            where: { id: response.id },
            data: { status: 'DELIVERED' },
          });
        } else {
          await prisma.inquiryResponse.update({
            where: { id: response.id },
            data: { status: 'FAILED' },
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      response: {
        id: response.id,
        content,
        status: response.status,
      },
    });
  } catch (error) {
    console.error('Error generating response:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
