/**
 * Script to create test documents with various confidence scores and statuses
 * for UI verification in production
 * 
 * This creates documents with:
 * - HIGH confidence (80-100%) - Green badges
 * - MEDIUM confidence (60-79%) - Yellow badges  
 * - LOW confidence (0-59%) - Red badges
 * - Various validation and review statuses
 * - Multiple document types
 */

import { PrismaClient, DocumentType, ValidationStatus, ReviewStatus, ExtractionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Document test data configurations
const testDocuments = [
  // HIGH CONFIDENCE (80-100%) - GREEN
  {
    fileName: 'medical_record_2024.pdf',
    type: 'MEDICAL_RECORD' as DocumentType,
    fileUrl: 'https://example.com/documents/medical_record_2024.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    category: 'Health Records',
    classificationConfidence: 95.5,
    classificationReasoning: 'Document contains clear medical terminology, patient information, and healthcare provider details with high confidence.',
    autoClassified: true,
    validationStatus: 'VALID' as ValidationStatus,
    reviewStatus: 'REVIEWED' as ReviewStatus,
    extractionStatus: 'COMPLETED' as ExtractionStatus,
    extractedText: 'Medical record for patient care...',
    isRequired: true,
  },
  {
    fileName: 'insurance_card_front.jpg',
    type: 'INSURANCE' as DocumentType,
    fileUrl: 'https://static.wixstatic.com/media/665868_17bb26436ae84c4389be74b36693c22d~mv2.png/v1/fill/w_414,h_238,al_c,lg_1,q_85/665868_17bb26436ae84c4389be74b36693c22d~mv2.png',
    fileSize: 512000,
    mimeType: 'image/jpeg',
    category: 'Insurance Documentation',
    classificationConfidence: 88.2,
    classificationReasoning: 'Clear insurance provider logo, policy number, and member information visible.',
    autoClassified: true,
    validationStatus: 'VALID' as ValidationStatus,
    reviewStatus: 'PENDING_REVIEW' as ReviewStatus,
    extractionStatus: 'COMPLETED' as ExtractionStatus,
    extractedText: 'Insurance policy details...',
    isRequired: true,
  },
  {
    fileName: 'drivers_license_scan.pdf',
    type: 'IDENTIFICATION' as DocumentType,
    fileUrl: 'https://example.com/documents/drivers_license_scan.pdf',
    fileSize: 256000,
    mimeType: 'application/pdf',
    category: 'Identification',
    classificationConfidence: 92.8,
    classificationReasoning: 'State-issued ID with photo, name, address, and expiration date clearly visible.',
    autoClassified: true,
    validationStatus: 'VALID' as ValidationStatus,
    reviewStatus: 'REVIEWED' as ReviewStatus,
    extractionStatus: 'COMPLETED' as ExtractionStatus,
    extractedText: 'Driver license information...',
    isRequired: true,
  },
  {
    fileName: 'advance_directive_2024.pdf',
    type: 'LEGAL' as DocumentType,
    fileUrl: 'https://example.com/documents/advance_directive_2024.pdf',
    fileSize: 768000,
    mimeType: 'application/pdf',
    category: 'Legal Documents',
    classificationConfidence: 85.0,
    classificationReasoning: 'Legal terminology and signature pages present, identified as healthcare directive.',
    autoClassified: true,
    validationStatus: 'VALID' as ValidationStatus,
    reviewStatus: 'NOT_REQUIRED' as ReviewStatus,
    extractionStatus: 'COMPLETED' as ExtractionStatus,
    extractedText: 'Advance directive instructions...',
    isRequired: false,
  },

  // MEDIUM CONFIDENCE (60-79%) - YELLOW
  {
    fileName: 'care_assessment_form.pdf',
    type: 'ASSESSMENT_FORM' as DocumentType,
    fileUrl: 'https://example.com/documents/care_assessment_form.pdf',
    fileSize: 896000,
    mimeType: 'application/pdf',
    category: 'Assessment Forms',
    classificationConfidence: 72.3,
    classificationReasoning: 'Contains assessment-related fields but some sections are incomplete or handwritten.',
    autoClassified: true,
    validationStatus: 'NEEDS_REVIEW' as ValidationStatus,
    reviewStatus: 'PENDING_REVIEW' as ReviewStatus,
    extractionStatus: 'COMPLETED' as ExtractionStatus,
    extractedText: 'Assessment form data...',
    isRequired: true,
  },
  {
    fileName: 'medical_history_partial.jpg',
    type: 'MEDICAL_RECORD' as DocumentType,
    fileUrl: 'https://templatelab.com/wp-content/uploads/2021/02/health-history-form-41.jpg',
    fileSize: 612000,
    mimeType: 'image/jpeg',
    category: 'Health Records',
    classificationConfidence: 68.9,
    classificationReasoning: 'Medical document detected but image quality is moderate, some text may be unclear.',
    autoClassified: true,
    validationStatus: 'PENDING' as ValidationStatus,
    reviewStatus: 'PENDING_REVIEW' as ReviewStatus,
    extractionStatus: 'COMPLETED' as ExtractionStatus,
    extractedText: 'Partial medical history...',
    isRequired: true,
  },
  {
    fileName: 'insurance_supplemental.pdf',
    type: 'INSURANCE' as DocumentType,
    fileUrl: 'https://example.com/documents/insurance_supplemental.pdf',
    fileSize: 445000,
    mimeType: 'application/pdf',
    category: 'Insurance Documentation',
    classificationConfidence: 65.7,
    classificationReasoning: 'Insurance-related content detected but document type classification has medium confidence.',
    autoClassified: true,
    validationStatus: 'NEEDS_REVIEW' as ValidationStatus,
    reviewStatus: 'NOT_REQUIRED' as ReviewStatus,
    extractionStatus: 'COMPLETED' as ExtractionStatus,
    extractedText: 'Supplemental insurance information...',
    isRequired: false,
  },
  {
    fileName: 'emergency_contact_list.pdf',
    type: 'EMERGENCY_CONTACT' as DocumentType,
    fileUrl: 'https://example.com/documents/emergency_contact_list.pdf',
    fileSize: 128000,
    mimeType: 'application/pdf',
    category: 'Contact Information',
    classificationConfidence: 70.5,
    classificationReasoning: 'Contact information format detected with moderate confidence.',
    autoClassified: true,
    validationStatus: 'VALID' as ValidationStatus,
    reviewStatus: 'PENDING_REVIEW' as ReviewStatus,
    extractionStatus: 'COMPLETED' as ExtractionStatus,
    extractedText: 'Emergency contacts...',
    isRequired: true,
  },

  // LOW CONFIDENCE (0-59%) - RED
  {
    fileName: 'unclear_document_001.jpg',
    type: 'GENERAL' as DocumentType,
    fileUrl: 'https://i.ytimg.com/vi/zu9vh24EeHs/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLDTCBVrIFMuWhUDYfFgtzVXBO1unQ',
    fileSize: 322000,
    mimeType: 'image/jpeg',
    category: 'Uncategorized',
    classificationConfidence: 45.2,
    classificationReasoning: 'Document type unclear due to poor image quality or mixed content. Manual review required.',
    autoClassified: true,
    validationStatus: 'INVALID' as ValidationStatus,
    reviewStatus: 'PENDING_REVIEW' as ReviewStatus,
    extractionStatus: 'FAILED' as ExtractionStatus,
    extractedText: null,
    extractionError: 'Image quality too low for reliable OCR extraction',
    isRequired: false,
  },
  {
    fileName: 'handwritten_notes.jpg',
    type: 'GENERAL' as DocumentType,
    fileUrl: 'https://i.ytimg.com/vi/Tg6dARHvx2Y/maxresdefault.jpg',
    fileSize: 198000,
    mimeType: 'image/jpeg',
    category: 'Notes',
    classificationConfidence: 38.6,
    classificationReasoning: 'Handwritten text detected but classification confidence is low due to illegibility.',
    autoClassified: true,
    validationStatus: 'NEEDS_REVIEW' as ValidationStatus,
    reviewStatus: 'PENDING_REVIEW' as ReviewStatus,
    extractionStatus: 'COMPLETED' as ExtractionStatus,
    extractedText: 'Partial handwritten content...',
    isRequired: false,
  },
  {
    fileName: 'mixed_content_scan.pdf',
    type: 'GENERAL' as DocumentType,
    fileUrl: 'https://example.com/documents/mixed_content_scan.pdf',
    fileSize: 1450000,
    mimeType: 'application/pdf',
    category: 'Mixed Documents',
    classificationConfidence: 52.1,
    classificationReasoning: 'Multiple document types detected in single file, unable to confidently classify.',
    autoClassified: true,
    validationStatus: 'PENDING' as ValidationStatus,
    reviewStatus: 'PENDING_REVIEW' as ReviewStatus,
    extractionStatus: 'PROCESSING' as ExtractionStatus,
    extractedText: null,
    isRequired: false,
  },
  {
    fileName: 'damaged_insurance_doc.jpg',
    type: 'INSURANCE' as DocumentType,
    fileUrl: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiwL6-0tyW1sX_GINWmu7ShPxDP3-JXQm0A1jf9u53am6yYVR6Szg1EbBXWPype5NNwGVVT9XkCUEPrq31_1JrYR07EPlWM2Kvusk83jYh1uE63M7S3Qlt8babV0hD6QDAnwI_EP-rg84C0/s1600/effdates.jpg',
    fileSize: 405000,
    mimeType: 'image/jpeg',
    category: 'Insurance Documentation',
    classificationConfidence: 28.9,
    classificationReasoning: 'Insurance document suspected but significant portions are illegible or damaged.',
    autoClassified: true,
    validationStatus: 'INVALID' as ValidationStatus,
    reviewStatus: 'PENDING_REVIEW' as ReviewStatus,
    extractionStatus: 'FAILED' as ExtractionStatus,
    extractedText: null,
    extractionError: 'Document damaged or corrupted, unable to extract reliable data',
    isRequired: true,
  },
];

async function createTestDocuments() {
  console.log('🚀 Starting test document creation for UI verification...\n');

  try {
    // Step 1: Get existing residents and users
    console.log('📊 Step 1: Fetching existing residents and users from database...');
    
    const residents = await prisma.resident.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const operators = await prisma.user.findMany({
      where: { role: 'OPERATOR' },
      take: 3,
    });

    if (residents.length === 0) {
      console.error('❌ No residents found in database. Cannot create test documents.');
      return;
    }

    if (operators.length === 0) {
      console.error('❌ No operators found in database. Cannot create test documents.');
      return;
    }

    console.log(`✅ Found ${residents.length} residents and ${operators.length} operators\n`);

    // Step 2: Create test documents
    console.log('📄 Step 2: Creating test documents with varied confidence scores...\n');

    const createdDocuments = [];
    let highConfCount = 0;
    let mediumConfCount = 0;
    let lowConfCount = 0;

    for (let i = 0; i < testDocuments.length; i++) {
      const docData = testDocuments[i];
      const resident = residents[i % residents.length]; // Distribute across residents
      const operator = operators[i % operators.length]; // Rotate through operators

      try {
        // Generate a human-readable title from fileName
        const title = docData.fileName
          .replace(/\.[^/.]+$/, '') // Remove extension
          .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
          .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word

        // Derive fileType from mimeType (e.g., "application/pdf" -> "pdf", "image/jpeg" -> "jpeg")
        const fileType = docData.mimeType.split('/')[1] || 'unknown';

        // Use raw SQL to insert since schema is out of sync with production DB
        const document = await prisma.$queryRawUnsafe(`
          INSERT INTO "Document" (
            id, type, category, "fileName", "fileUrl", "fileType", "fileSize", "mimeType",
            "extractedText", "extractedData", "extractionStatus", "extractionError",
            "classificationConfidence", "classificationReasoning", "autoClassified",
            "validationStatus", "reviewStatus", "isRequired",
            "residentId", "uploadedById", tags, notes, title,
            "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid()::text, $1::"DocumentType", $2, $3, $4, $5, $6, $7,
            $8, $9::jsonb, $10::"ExtractionStatus", $11,
            $12, $13, $14,
            $15::"ValidationStatus", $16::"ReviewStatus", $17,
            $18, $19, $20::text[], $21, $22,
            NOW(), NOW()
          )
          RETURNING id
        `,
          docData.type, docData.category, docData.fileName, docData.fileUrl, fileType, docData.fileSize, docData.mimeType,
          docData.extractedText || null, JSON.stringify({ sampleKey: 'sampleValue', processed: true }), 
          docData.extractionStatus, docData.extractionError || null,
          docData.classificationConfidence, docData.classificationReasoning, docData.autoClassified,
          docData.validationStatus, docData.reviewStatus, docData.isRequired,
          resident.id, operator.id, 
          '{test,ui-verification}', // PostgreSQL array literal syntax
          `Test document created for UI verification (Confidence: ${docData.classificationConfidence}%)`,
          title
        ) as any;

        createdDocuments.push({
          ...docData,
          id: (document as any)[0]?.id,
          residentId: resident.id,
          uploadedById: operator.id,
        });

        // Count by confidence level
        if (docData.classificationConfidence! >= 80) {
          highConfCount++;
          console.log(`  ✅ [HIGH] Created: ${docData.fileName} (${docData.classificationConfidence}% confidence) - ${docData.validationStatus}`);
        } else if (docData.classificationConfidence! >= 60) {
          mediumConfCount++;
          console.log(`  ⚠️  [MEDIUM] Created: ${docData.fileName} (${docData.classificationConfidence}% confidence) - ${docData.validationStatus}`);
        } else {
          lowConfCount++;
          console.log(`  ❌ [LOW] Created: ${docData.fileName} (${docData.classificationConfidence}% confidence) - ${docData.validationStatus}`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to create document ${docData.fileName}:`, error);
      }
    }

    // Step 3: Display summary
    console.log('\n📊 === DOCUMENT CREATION SUMMARY ===');
    console.log(`\nTotal Documents Created: ${createdDocuments.length}/${testDocuments.length}`);
    console.log(`\n🎨 Confidence Score Distribution:`);
    console.log(`  🟢 HIGH (80-100%):    ${highConfCount} documents`);
    console.log(`  🟡 MEDIUM (60-79%):   ${mediumConfCount} documents`);
    console.log(`  🔴 LOW (0-59%):       ${lowConfCount} documents`);

    // Count by validation status using the test data
    const validCount = highConfCount + mediumConfCount + lowConfCount > 0 ? 
      testDocuments.slice(0, createdDocuments.length).filter(d => d.validationStatus === 'VALID').length : 0;
    const invalidCount = highConfCount + mediumConfCount + lowConfCount > 0 ?
      testDocuments.slice(0, createdDocuments.length).filter(d => d.validationStatus === 'INVALID').length : 0;
    const needsReviewCount = highConfCount + mediumConfCount + lowConfCount > 0 ?
      testDocuments.slice(0, createdDocuments.length).filter(d => d.validationStatus === 'NEEDS_REVIEW').length : 0;
    const pendingCount = highConfCount + mediumConfCount + lowConfCount > 0 ?
      testDocuments.slice(0, createdDocuments.length).filter(d => d.validationStatus === 'PENDING').length : 0;

    console.log(`\n✅ Validation Status Distribution:`);
    console.log(`  VALID:        ${validCount}`);
    console.log(`  INVALID:      ${invalidCount}`);
    console.log(`  NEEDS_REVIEW: ${needsReviewCount}`);
    console.log(`  PENDING:      ${pendingCount}`);

    // Count by review status using the test data
    const reviewedCount = createdDocuments.length > 0 ?
      testDocuments.slice(0, createdDocuments.length).filter(d => d.reviewStatus === 'REVIEWED').length : 0;
    const pendingReviewCount = createdDocuments.length > 0 ?
      testDocuments.slice(0, createdDocuments.length).filter(d => d.reviewStatus === 'PENDING_REVIEW').length : 0;
    const notRequiredCount = createdDocuments.length > 0 ?
      testDocuments.slice(0, createdDocuments.length).filter(d => d.reviewStatus === 'NOT_REQUIRED').length : 0;

    console.log(`\n📋 Review Status Distribution:`);
    console.log(`  REVIEWED:       ${reviewedCount}`);
    console.log(`  PENDING_REVIEW: ${pendingReviewCount}`);
    console.log(`  NOT_REQUIRED:   ${notRequiredCount}`);

    // Count by document type using the test data
    const typeCount: Record<string, number> = {};
    testDocuments.slice(0, createdDocuments.length).forEach(doc => {
      typeCount[doc.type] = (typeCount[doc.type] || 0) + 1;
    });

    console.log(`\n📑 Document Type Distribution:`);
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  ${type.padEnd(20)}: ${count}`);
    });

    console.log(`\n✅ Associated with:`);
    console.log(`  ${residents.length} resident(s)`);
    console.log(`  ${operators.length} operator(s)`);

    console.log('\n🎉 Test document creation completed successfully!');
    console.log('\n📌 Next Steps:');
    console.log('  1. Visit https://carelinkai.onrender.com/operator/documents');
    console.log('  2. Verify color-coded confidence badges (Green/Yellow/Red)');
    console.log('  3. Check validation and review status indicators');
    console.log('  4. Test filtering by confidence levels and statuses');

    // Write summary to file
    const summary = {
      timestamp: new Date().toISOString(),
      totalCreated: createdDocuments.length,
      confidenceDistribution: {
        high: highConfCount,
        medium: mediumConfCount,
        low: lowConfCount,
      },
      validationDistribution: {
        valid: validCount,
        invalid: invalidCount,
        needsReview: needsReviewCount,
        pending: pendingCount,
      },
      reviewDistribution: {
        reviewed: reviewedCount,
        pendingReview: pendingReviewCount,
        notRequired: notRequiredCount,
      },
      documentTypes: typeCount,
      associatedResidents: residents.map(r => ({ id: r.id, name: `${r.firstName} ${r.lastName}` })),
      associatedOperators: operators.map(o => ({ id: o.id, email: o.email })),
    };

    const fs = require('fs');
    fs.writeFileSync(
      '/home/ubuntu/TEST_DOCUMENTS_CREATED.json',
      JSON.stringify(summary, null, 2)
    );

    console.log('\n💾 Summary saved to: /home/ubuntu/TEST_DOCUMENTS_CREATED.json');

  } catch (error) {
    console.error('\n❌ Error during test document creation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestDocuments()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
