import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration?: number;
}

class InquirySystemTester {
  private results: TestResult[] = [];
  private testInquiryId: string | null = null;
  
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive Test Suite for Feature #4\n');
    console.log('='.repeat(80));
    
    // Phase 1 Tests
    await this.testPhase1();
    
    // Phase 2 Tests
    await this.testPhase2();
    
    // Phase 3 Tests
    await this.testPhase3();
    
    // Cleanup
    await this.cleanup();
    
    // Generate report
    this.generateReport();
  }
  
  // ============================================
  // PHASE 1: BACKEND FOUNDATION TESTS
  // ============================================
  
  async testPhase1(): Promise<void> {
    console.log('\n📦 PHASE 1: Backend Foundation Tests\n');
    
    await this.testDatabaseConnection();
    await this.testInquiryCreation();
    await this.testInquiryRetrieval();
    await this.testInquiryUpdate();
    await this.testResponseCreation();
    await this.testFollowUpCreation();
  }
  
  async testDatabaseConnection(): Promise<void> {
    const start = Date.now();
    try {
      await prisma.$connect();
      const count = await prisma.inquiry.count();
      this.addResult({
        name: 'Database Connection',
        status: 'PASS',
        message: `Connected successfully. Found ${count} existing inquiries.`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.addResult({
        name: 'Database Connection',
        status: 'FAIL',
        message: `Failed to connect: ${error}`,
        duration: Date.now() - start,
      });
    }
  }
  
  async testInquiryCreation(): Promise<void> {
    const start = Date.now();
    try {
      // Get a test family and home for the inquiry
      const testFamily = await prisma.family.findFirst();
      const testHome = await prisma.assistedLivingHome.findFirst();
      
      if (!testFamily || !testHome) {
        this.addResult({
          name: 'Inquiry Creation',
          status: 'SKIP',
          message: 'No test family or home found in database',
          duration: Date.now() - start,
        });
        return;
      }
      
      const inquiry = await prisma.inquiry.create({
        data: {
          familyId: testFamily.id,
          homeId: testHome.id,
          status: 'NEW',
          message: 'Test inquiry for system testing',
          contactName: 'Test User',
          contactEmail: 'test@example.com',
          contactPhone: '+15551234567',
          careRecipientName: 'John Doe',
          careRecipientAge: 75,
          careNeeds: ['MEMORY_CARE', 'MEDICATION_MANAGEMENT'],
          urgency: 'HIGH',
          source: 'WEBSITE',
          preferredContactMethod: 'EMAIL',
          additionalInfo: 'Test inquiry for comprehensive system testing',
        },
      });
      
      this.testInquiryId = inquiry.id;
      
      this.addResult({
        name: 'Inquiry Creation',
        status: 'PASS',
        message: `Created inquiry ${inquiry.id} successfully`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.addResult({
        name: 'Inquiry Creation',
        status: 'FAIL',
        message: `Failed to create inquiry: ${error}`,
        duration: Date.now() - start,
      });
    }
  }
  
  async testInquiryRetrieval(): Promise<void> {
    const start = Date.now();
    if (!this.testInquiryId) {
      this.addResult({
        name: 'Inquiry Retrieval',
        status: 'SKIP',
        message: 'No test inquiry available',
      });
      return;
    }
    
    try {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id: this.testInquiryId },
        include: {
          responses: true,
          followUps: true,
        },
      });
      
      if (inquiry) {
        this.addResult({
          name: 'Inquiry Retrieval',
          status: 'PASS',
          message: `Retrieved inquiry with ${inquiry.responses.length} responses and ${inquiry.followUps.length} follow-ups`,
          duration: Date.now() - start,
        });
      } else {
        this.addResult({
          name: 'Inquiry Retrieval',
          status: 'FAIL',
          message: 'Inquiry not found',
          duration: Date.now() - start,
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Inquiry Retrieval',
        status: 'FAIL',
        message: `Failed to retrieve inquiry: ${error}`,
        duration: Date.now() - start,
      });
    }
  }
  
  async testInquiryUpdate(): Promise<void> {
    const start = Date.now();
    if (!this.testInquiryId) {
      this.addResult({
        name: 'Inquiry Update',
        status: 'SKIP',
        message: 'No test inquiry available',
      });
      return;
    }
    
    try {
      const updated = await prisma.inquiry.update({
        where: { id: this.testInquiryId },
        data: {
          status: 'CONTACTED',
          internalNotes: 'Updated during testing',
        },
      });
      
      this.addResult({
        name: 'Inquiry Update',
        status: 'PASS',
        message: `Updated inquiry status to ${updated.status}`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.addResult({
        name: 'Inquiry Update',
        status: 'FAIL',
        message: `Failed to update inquiry: ${error}`,
        duration: Date.now() - start,
      });
    }
  }
  
  async testResponseCreation(): Promise<void> {
    const start = Date.now();
    if (!this.testInquiryId) {
      this.addResult({
        name: 'Response Creation',
        status: 'SKIP',
        message: 'No test inquiry available',
      });
      return;
    }
    
    try {
      const response = await prisma.inquiryResponse.create({
        data: {
          inquiryId: this.testInquiryId,
          content: 'This is a test response',
          type: 'MANUAL',
          channel: 'EMAIL',
          sentBy: 'SYSTEM',
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      
      this.addResult({
        name: 'Response Creation',
        status: 'PASS',
        message: `Created response ${response.id}`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.addResult({
        name: 'Response Creation',
        status: 'FAIL',
        message: `Failed to create response: ${error}`,
        duration: Date.now() - start,
      });
    }
  }
  
  async testFollowUpCreation(): Promise<void> {
    const start = Date.now();
    if (!this.testInquiryId) {
      this.addResult({
        name: 'Follow-up Creation',
        status: 'SKIP',
        message: 'No test inquiry available',
      });
      return;
    }
    
    try {
      const followUp = await prisma.followUp.create({
        data: {
          inquiryId: this.testInquiryId,
          scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          type: 'EMAIL',
          status: 'PENDING',
          content: 'Test follow-up',
        },
      });
      
      this.addResult({
        name: 'Follow-up Creation',
        status: 'PASS',
        message: `Created follow-up ${followUp.id}`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.addResult({
        name: 'Follow-up Creation',
        status: 'FAIL',
        message: `Failed to create follow-up: ${error}`,
        duration: Date.now() - start,
      });
    }
  }
  
  // ============================================
  // PHASE 2: AI RESPONSE GENERATION TESTS
  // ============================================
  
  async testPhase2(): Promise<void> {
    console.log('\n🤖 PHASE 2: AI Response Generation Tests\n');
    
    await this.testAIServiceImport();
    await this.testEmailServiceImport();
    await this.testResponseTemplates();
  }
  
  async testAIServiceImport(): Promise<void> {
    const start = Date.now();
    try {
      const aiModule = await import('../../src/lib/ai/inquiry-response-generator');
      
      if (aiModule.inquiryResponseGenerator) {
        this.addResult({
          name: 'AI Service Import',
          status: 'PASS',
          message: 'AI response generator imported successfully',
          duration: Date.now() - start,
        });
      } else {
        this.addResult({
          name: 'AI Service Import',
          status: 'FAIL',
          message: 'AI response generator is undefined',
          duration: Date.now() - start,
        });
      }
    } catch (error) {
      this.addResult({
        name: 'AI Service Import',
        status: 'FAIL',
        message: `Failed to import AI service: ${error}`,
        duration: Date.now() - start,
      });
    }
  }
  
  async testEmailServiceImport(): Promise<void> {
    const start = Date.now();
    try {
      const emailModule = await import('../../src/lib/email/inquiry-email-service');
      
      if (emailModule.inquiryEmailService) {
        this.addResult({
          name: 'Email Service Import',
          status: 'PASS',
          message: 'Email service imported successfully',
          duration: Date.now() - start,
        });
      } else {
        this.addResult({
          name: 'Email Service Import',
          status: 'FAIL',
          message: 'Email service is undefined',
          duration: Date.now() - start,
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Email Service Import',
        status: 'FAIL',
        message: `Failed to import email service: ${error}`,
        duration: Date.now() - start,
      });
    }
  }
  
  async testResponseTemplates(): Promise<void> {
    const start = Date.now();
    try {
      const templateModule = await import('../../src/lib/ai/response-templates');
      
      const templateCount = Object.keys(templateModule.responseTemplates).length;
      
      this.addResult({
        name: 'Response Templates',
        status: 'PASS',
        message: `Found ${templateCount} response templates`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.addResult({
        name: 'Response Templates',
        status: 'FAIL',
        message: `Failed to load templates: ${error}`,
        duration: Date.now() - start,
      });
    }
  }
  
  // ============================================
  // PHASE 3: AUTOMATED FOLLOW-UP TESTS
  // ============================================
  
  async testPhase3(): Promise<void> {
    console.log('\n⏰ PHASE 3: Automated Follow-up Tests\n');
    
    await this.testFollowUpRulesEngine();
    await this.testFollowUpScheduler();
    await this.testSMSServiceImport();
    await this.testFollowUpProcessor();
  }
  
  async testFollowUpRulesEngine(): Promise<void> {
    const start = Date.now();
    try {
      const rulesModule = await import('../../src/lib/followup/followup-rules');
      
      const ruleCount = rulesModule.defaultFollowUpRules.length;
      
      this.addResult({
        name: 'Follow-up Rules Engine',
        status: 'PASS',
        message: `Rules engine loaded with ${ruleCount} default rules`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.addResult({
        name: 'Follow-up Rules Engine',
        status: 'FAIL',
        message: `Failed to load rules engine: ${error}`,
        duration: Date.now() - start,
      });
    }
  }
  
  async testFollowUpScheduler(): Promise<void> {
    const start = Date.now();
    try {
      const schedulerModule = await import('../../src/lib/followup/followup-scheduler');
      
      if (schedulerModule.followUpScheduler) {
        this.addResult({
          name: 'Follow-up Scheduler',
          status: 'PASS',
          message: 'Follow-up scheduler imported successfully',
          duration: Date.now() - start,
        });
      } else {
        this.addResult({
          name: 'Follow-up Scheduler',
          status: 'FAIL',
          message: 'Follow-up scheduler is undefined',
          duration: Date.now() - start,
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Follow-up Scheduler',
        status: 'FAIL',
        message: `Failed to import scheduler: ${error}`,
        duration: Date.now() - start,
      });
    }
  }
  
  async testSMSServiceImport(): Promise<void> {
    const start = Date.now();
    try {
      const smsModule = await import('../../src/lib/sms/sms-service');
      
      if (smsModule.smsService) {
        this.addResult({
          name: 'SMS Service Import',
          status: 'PASS',
          message: 'SMS service imported successfully',
          duration: Date.now() - start,
        });
      } else {
        this.addResult({
          name: 'SMS Service Import',
          status: 'FAIL',
          message: 'SMS service is undefined',
          duration: Date.now() - start,
        });
      }
    } catch (error) {
      this.addResult({
        name: 'SMS Service Import',
        status: 'FAIL',
        message: `Failed to import SMS service: ${error}`,
        duration: Date.now() - start,
      });
    }
  }
  
  async testFollowUpProcessor(): Promise<void> {
    const start = Date.now();
    try {
      const processorModule = await import('../../src/lib/followup/followup-processor');
      
      if (processorModule.followUpProcessor) {
        this.addResult({
          name: 'Follow-up Processor',
          status: 'PASS',
          message: 'Follow-up processor imported successfully',
          duration: Date.now() - start,
        });
      } else {
        this.addResult({
          name: 'Follow-up Processor',
          status: 'FAIL',
          message: 'Follow-up processor is undefined',
          duration: Date.now() - start,
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Follow-up Processor',
        status: 'FAIL',
        message: `Failed to import processor: ${error}`,
        duration: Date.now() - start,
      });
    }
  }
  
  // ============================================
  // CLEANUP
  // ============================================
  
  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...\n');
    
    if (this.testInquiryId) {
      try {
        // Delete follow-ups
        await prisma.followUp.deleteMany({
          where: { inquiryId: this.testInquiryId },
        });
        
        // Delete responses
        await prisma.inquiryResponse.deleteMany({
          where: { inquiryId: this.testInquiryId },
        });
        
        // Delete inquiry
        await prisma.inquiry.delete({
          where: { id: this.testInquiryId },
        });
        
        console.log(`✅ Cleaned up test inquiry ${this.testInquiryId}`);
      } catch (error) {
        console.log(`⚠️  Failed to cleanup: ${error}`);
      }
    }
    
    await prisma.$disconnect();
  }
  
  // ============================================
  // REPORTING
  // ============================================
  
  addResult(result: TestResult): void {
    this.results.push(result);
    
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${icon} ${result.name}${duration}`);
    console.log(`   ${result.message}\n`);
  }
  
  generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY REPORT');
    console.log('='.repeat(80) + '\n');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`\nSuccess Rate: ${((passed / (total - skipped)) * 100).toFixed(1)}%\n`);
    
    if (failed > 0) {
      console.log('❌ FAILED TESTS:\n');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  • ${r.name}`);
          console.log(`    ${r.message}\n`);
        });
    }
    
    console.log('='.repeat(80));
    
    if (failed === 0 && passed > 0) {
      console.log('\n🎉 ALL TESTS PASSED! System is ready for Phase 4.\n');
    } else if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Please review and fix issues before proceeding.\n');
    }
  }
}

// Run tests
const tester = new InquirySystemTester();
tester.runAllTests().catch(console.error);
