export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAnthropicClient } from '@/lib/ai/claude';
// @ts-ignore — pdfkit has types but require works
const PDFDocument = require('pdfkit');

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const op = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!op) return NextResponse.json({ error: 'Operator only' }, { status: 403 });

  const resident = await prisma.resident.findFirst({
    where: { id: params.id, home: { operatorId: op.id } },
    include: {
      home: { select: { name: true, address: true } },
      familyContacts: true,
      contacts: true,
      emergencyPreferences: true,
    },
  });
  if (!resident) return NextResponse.json({ error: 'Resident not found' }, { status: 404 });

  // Build context for Claude
  const residentContext = `
Name: ${resident.firstName} ${resident.lastName}
Date of Birth: ${resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString() : 'N/A'}
Gender: ${resident.gender || 'N/A'}
Admission Date: ${resident.admissionDate ? new Date(resident.admissionDate).toLocaleDateString() : 'N/A'}
Home: ${resident.home?.name || 'N/A'}
Status: ${resident.status}
Medical Conditions: ${resident.medicalConditions || 'None documented'}
Medications: ${resident.medications || 'None documented'}
Allergies: ${resident.allergies || 'None documented'}
Dietary Restrictions: ${resident.dietaryRestrictions || 'None documented'}
Notes: ${resident.notes || 'None'}
`.trim();

  // Ask Claude to write a professional intake narrative
  const client = getAnthropicClient();
  const aiResponse = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `Write a concise, professional intake narrative paragraph (3–5 sentences) for a resident admission packet. Be clinical but warm. Use only the information provided — do not invent details.\n\n${residentContext}`,
      },
    ],
  });
  const narrative =
    aiResponse.content[0]?.type === 'text' ? aiResponse.content[0].text : '';

  // Generate PDF
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const BLUE = '#1e40af';
    const LIGHT_BLUE = '#3b82f6';
    const GRAY = '#6b7280';
    const DIVIDER = '#e5e7eb';
    const pageW = doc.page.width - 100;

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill(BLUE);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
      .text('CareLinkAI', 50, 20);
    doc.fontSize(10).font('Helvetica')
      .text('Resident Intake Packet', 50, 46);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 60);
    doc.moveDown(2);

    // Resident name banner
    doc.fillColor(BLUE).fontSize(18).font('Helvetica-Bold')
      .text(`${resident.firstName} ${resident.lastName}`, 50, 100);
    doc.fillColor(GRAY).fontSize(10).font('Helvetica')
      .text(`${resident.home?.name || ''} · Admitted: ${resident.admissionDate ? new Date(resident.admissionDate).toLocaleDateString() : 'Pending'}`, 50, 124);
    doc.moveTo(50, 140).lineTo(50 + pageW, 140).strokeColor(DIVIDER).stroke();

    const section = (title: string, yOffset = 20) => {
      doc.moveDown(1.2);
      doc.fillColor(BLUE).fontSize(11).font('Helvetica-Bold').text(title.toUpperCase());
      doc.moveTo(doc.x, doc.y + 2).lineTo(doc.x + pageW, doc.y + 2).strokeColor(LIGHT_BLUE).lineWidth(1).stroke();
      doc.moveDown(0.4);
      doc.fillColor('#111827').fontSize(10).font('Helvetica');
    };

    const row = (label: string, value: string) => {
      doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(value || 'Not documented');
    };

    // AI Narrative
    section('Clinical Summary');
    doc.text(narrative || 'See individual fields below.', { lineGap: 3 });

    // Demographics
    section('Patient Information');
    row('Full Name', `${resident.firstName} ${resident.lastName}`);
    row('Date of Birth', resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString() : 'N/A');
    row('Gender', resident.gender || 'N/A');
    row('Admission Date', resident.admissionDate ? new Date(resident.admissionDate).toLocaleDateString() : 'Pending');
    row('Facility', resident.home?.name || 'N/A');
    row('Status', resident.status);

    // Medical
    section('Medical Information');
    row('Medical Conditions', resident.medicalConditions || 'None documented');
    row('Current Medications', resident.medications || 'None documented');
    row('Allergies', resident.allergies || 'None documented');
    row('Dietary Restrictions', resident.dietaryRestrictions || 'None documented');

    // Emergency / DNR
    const emergencyPref = resident.emergencyPreferences?.[0];
    section('Emergency Preferences & DNR');
    if (emergencyPref) {
      const pref = emergencyPref as any;
      row('DNR Status', pref.dnrStatus ?? 'Not specified');
      row('Hospitalization Preference', pref.hospitalizationPreference ?? 'Not specified');
      row('Organ Donation', pref.organDonation ?? 'Not specified');
    } else {
      doc.text('No emergency preferences documented.');
    }

    // Emergency Contacts
    section('Emergency Contacts');
    const contacts = [...(resident.familyContacts ?? []), ...(resident.contacts ?? [])];
    if (contacts.length === 0) {
      doc.text('No contacts on file.');
    } else {
      contacts.slice(0, 5).forEach((c: any, i: number) => {
        const name = c.name ?? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
        row(`Contact ${i + 1}`, `${name} · ${c.relationship ?? c.relation ?? ''} · ${c.phone ?? c.phoneNumber ?? ''}`);
      });
    }

    // Notes
    if (resident.notes) {
      section('Additional Notes');
      doc.text(resident.notes, { lineGap: 3 });
    }

    // Footer
    const footerY = doc.page.height - 50;
    doc.moveTo(50, footerY - 5).lineTo(50 + pageW, footerY - 5).strokeColor(DIVIDER).stroke();
    doc.fillColor(GRAY).fontSize(8).font('Helvetica')
      .text('CONFIDENTIAL — CareLinkAI Resident Intake Packet. For authorized personnel only.', 50, footerY, { align: 'center', width: pageW });

    doc.end();
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="intake-${resident.firstName}-${resident.lastName}.pdf"`,
    },
  });
}
