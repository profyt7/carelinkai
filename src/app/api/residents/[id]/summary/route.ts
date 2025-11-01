import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { recordDataExport } from '@/lib/audit';
// Note: pdfkit has no default TS types in some setups; import as any to avoid build breaks.
// HIPAA: Keep content minimal; avoid sensitive diagnoses or notes here.
// Assumption: Operators/Admins only. Family variant will live under /api/family.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

const prisma = new PrismaClient();

async function ensureAccess(userEmail: string, residentId: string) {
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) return { status: 401 as const };
  if (user.role === UserRole.ADMIN) return { status: 200 as const, user };
  if (user.role === UserRole.OPERATOR) {
    const op = await prisma.operator.findUnique({ where: { userId: user.id } });
    if (!op) return { status: 403 as const };
    const res = await prisma.resident.findUnique({ where: { id: residentId }, select: { home: { select: { operatorId: true } } } });
    if (!res) return { status: 404 as const };
    if (res.home && res.home.operatorId !== op.id) return { status: 403 as const };
    return { status: 200 as const, user };
  }
  return { status: 403 as const };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const access = await ensureAccess(session!.user!.email!, params.id);
    if (access.status !== 200) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });

    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: {
        id: true, firstName: true, lastName: true, status: true, dateOfBirth: true, gender: true,
        home: { select: { name: true, address: true } },
        createdAt: true, updatedAt: true,
      },
    });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Generate PDF in memory
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Header
    doc.fontSize(18).text('CareLinkAI - Resident Summary', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#555').text('Generated for care operations. Do not distribute externally.', { align: 'left' });
    doc.moveDown();
    doc.fillColor('#000');

    // Resident block
    doc.fontSize(14).text(`${resident.firstName} ${resident.lastName}`);
    doc.fontSize(11).text(`Status: ${resident.status}`);
    if (resident.gender) doc.text(`Gender: ${resident.gender}`);
    if (resident.dateOfBirth) doc.text(`DOB: ${new Date(resident.dateOfBirth).toLocaleDateString()}`);
    if (resident.home) {
      doc.text(`Home: ${resident.home.name}`);
      if (resident.home.address) doc.text(`Address: ${resident.home.address}`);
    }

    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text(`Created: ${resident.createdAt.toISOString()}`);
    doc.text(`Updated: ${resident.updatedAt.toISOString()}`);
    doc.fillColor('#000');

    doc.moveDown();
    doc.fontSize(11).text('Notes', { underline: true });
    doc.fontSize(10).fillColor('#555').text('This summary intentionally omits sensitive clinical notes. Refer to EHR for detailed PHI.', { align: 'left' });
    doc.fillColor('#000');

    // Footer
    doc.moveDown();
    doc.fontSize(9).fillColor('#888').text('HIPAA: Accessed for Treatment/Operations. Logged for compliance.', { align: 'left' });
    doc.end();

    const pdf = await done;

    // Audit export
    await recordDataExport(access.user!.id, 'Resident', 'pdf', { residentId: resident.id }, 1, req);

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="resident-${resident.id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('Resident summary pdf error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
