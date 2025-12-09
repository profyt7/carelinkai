"use strict";
/**
 * Test Users Seed Script for Playwright E2E Testing
 *
 * This script creates test users for all roles in the CareLinkAI RBAC system:
 * - ADMIN: Full system access
 * - OPERATOR: Scoped to specific homes
 * - CAREGIVER: Limited access, assigned to residents
 * - FAMILY: View-only access to specific resident
 *
 * Test Credentials:
 * - admin.test@carelinkai.com / TestAdmin123!
 * - operator.test@carelinkai.com / TestOperator123!
 * - caregiver.test@carelinkai.com / TestCaregiver123!
 * - family.test@carelinkai.com / TestFamily123!
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = require("bcryptjs");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var testPassword, adminUser, operatorUser, operator, testHome, caregiverUser, caregiver, familyUser, family, testResident;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🌱 Starting test users seed...');
                    return [4 /*yield*/, bcrypt.hash('TestPassword123!', 12)];
                case 1:
                    testPassword = _a.sent();
                    // ===== 1. CREATE ADMIN TEST USER =====
                    console.log('Creating admin test user...');
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'admin.test@carelinkai.com' },
                            update: {},
                            create: {
                                email: 'admin.test@carelinkai.com',
                                passwordHash: testPassword,
                                firstName: 'Admin',
                                lastName: 'Test User',
                                phone: '+1-555-0100',
                                role: client_1.UserRole.ADMIN,
                                status: client_1.UserStatus.ACTIVE,
                                emailVerified: new Date(),
                                notificationPrefs: {},
                                preferences: {},
                            },
                        })];
                case 2:
                    adminUser = _a.sent();
                    console.log("\u2705 Admin user created: ".concat(adminUser.email));
                    // ===== 2. CREATE OPERATOR TEST USER WITH HOME =====
                    console.log('Creating operator test user...');
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'operator.test@carelinkai.com' },
                            update: {},
                            create: {
                                email: 'operator.test@carelinkai.com',
                                passwordHash: testPassword,
                                firstName: 'Operator',
                                lastName: 'Test User',
                                phone: '+1-555-0101',
                                role: client_1.UserRole.OPERATOR,
                                status: client_1.UserStatus.ACTIVE,
                                emailVerified: new Date(),
                                notificationPrefs: {},
                                preferences: {},
                            },
                        })];
                case 3:
                    operatorUser = _a.sent();
                    return [4 /*yield*/, prisma.operator.upsert({
                            where: { userId: operatorUser.id },
                            update: {},
                            create: {
                                userId: operatorUser.id,
                                companyName: 'Test Care Homes Inc.',
                                taxId: 'TEST-TAX-123',
                                businessLicense: 'TEST-LICENSE-456',
                                preferences: {},
                            },
                        })];
                case 4:
                    operator = _a.sent();
                    return [4 /*yield*/, prisma.assistedLivingHome.upsert({
                            where: { id: 'test-home-001' },
                            update: {},
                            create: {
                                id: 'test-home-001',
                                operatorId: operator.id,
                                name: 'Test Assisted Living Home',
                                description: 'This is a test home for E2E testing',
                                status: client_1.HomeStatus.ACTIVE,
                                careLevel: [client_1.CareLevel.ASSISTED, client_1.CareLevel.MEMORY_CARE],
                                capacity: 50,
                                currentOccupancy: 5,
                                priceMin: 3000,
                                priceMax: 6000,
                                amenities: ['Wifi', '24/7 Care', 'Meals Included'],
                            },
                        })];
                case 5:
                    testHome = _a.sent();
                    console.log("\u2705 Operator user created: ".concat(operatorUser.email, " with home: ").concat(testHome.name));
                    // ===== 3. CREATE CAREGIVER TEST USER =====
                    console.log('Creating caregiver test user...');
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'caregiver.test@carelinkai.com' },
                            update: {},
                            create: {
                                email: 'caregiver.test@carelinkai.com',
                                passwordHash: testPassword,
                                firstName: 'Caregiver',
                                lastName: 'Test User',
                                phone: '+1-555-0102',
                                role: client_1.UserRole.CAREGIVER,
                                status: client_1.UserStatus.ACTIVE,
                                emailVerified: new Date(),
                                notificationPrefs: {},
                                preferences: {},
                            },
                        })];
                case 6:
                    caregiverUser = _a.sent();
                    return [4 /*yield*/, prisma.caregiver.upsert({
                            where: { userId: caregiverUser.id },
                            update: {},
                            create: {
                                userId: caregiverUser.id,
                                bio: 'Experienced caregiver for testing',
                                yearsExperience: 5,
                                hourlyRate: 25.00,
                                availability: { monday: '9am-5pm', tuesday: '9am-5pm' },
                                specialties: ['Memory Care', 'Medication Management'],
                            },
                        })];
                case 7:
                    caregiver = _a.sent();
                    // Create employment relationship between caregiver and operator
                    return [4 /*yield*/, prisma.caregiverEmployment.upsert({
                            where: { id: 'test-employment-001' },
                            update: {},
                            create: {
                                id: 'test-employment-001',
                                caregiverId: caregiver.id,
                                operatorId: operator.id,
                                position: 'Caregiver',
                                startDate: new Date('2024-01-01'),
                                isActive: true,
                            },
                        })];
                case 8:
                    // Create employment relationship between caregiver and operator
                    _a.sent();
                    console.log("\u2705 Caregiver user created: ".concat(caregiverUser.email, " and assigned to operator"));
                    // ===== 4. CREATE FAMILY TEST USER WITH RESIDENT =====
                    console.log('Creating family test user...');
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'family.test@carelinkai.com' },
                            update: {},
                            create: {
                                email: 'family.test@carelinkai.com',
                                passwordHash: testPassword,
                                firstName: 'Family',
                                lastName: 'Test User',
                                phone: '+1-555-0103',
                                role: client_1.UserRole.FAMILY,
                                status: client_1.UserStatus.ACTIVE,
                                emailVerified: new Date(),
                                notificationPrefs: {},
                                preferences: {},
                            },
                        })];
                case 9:
                    familyUser = _a.sent();
                    return [4 /*yield*/, prisma.family.upsert({
                            where: { userId: familyUser.id },
                            update: {},
                            create: {
                                userId: familyUser.id,
                                primaryContactName: 'Family Test User',
                                phone: '+1-555-0103',
                                relationshipToRecipient: 'Daughter',
                                emergencyContact: 'Family Test User',
                                emergencyPhone: '+1-555-0103',
                            },
                        })];
                case 10:
                    family = _a.sent();
                    return [4 /*yield*/, prisma.resident.upsert({
                            where: { id: 'test-resident-001' },
                            update: {},
                            create: {
                                id: 'test-resident-001',
                                familyId: family.id,
                                homeId: testHome.id,
                                firstName: 'Test',
                                lastName: 'Resident',
                                dateOfBirth: new Date('1950-01-01'),
                                gender: 'FEMALE',
                                status: client_1.ResidentStatus.ACTIVE,
                                careNeeds: { mobility: 'Limited', cognitive: 'Good' },
                                medicalConditions: 'Arthritis, Hypertension',
                                medications: 'Lisinopril 10mg daily',
                                allergies: 'Penicillin',
                                dietaryRestrictions: 'Low sodium',
                                notes: 'Prefers morning activities',
                            },
                        })];
                case 11:
                    testResident = _a.sent();
                    // Create family contact for the resident
                    return [4 /*yield*/, prisma.familyContact.upsert({
                            where: { id: 'test-family-contact-001' },
                            update: {},
                            create: {
                                id: 'test-family-contact-001',
                                residentId: testResident.id,
                                name: 'Family Test User',
                                relationship: 'Daughter',
                                phone: '+1-555-0103',
                                email: 'family.test@carelinkai.com',
                                isPrimaryContact: true,
                                permissionLevel: 'FULL_ACCESS',
                                contactPreference: 'EMAIL',
                                notes: 'Primary contact for all communications',
                            },
                        })];
                case 12:
                    // Create family contact for the resident
                    _a.sent();
                    console.log("\u2705 Family user created: ".concat(familyUser.email, " with resident: ").concat(testResident.firstName, " ").concat(testResident.lastName));
                    // ===== 5. CREATE TEST DATA FOR RESIDENT =====
                    console.log('Creating test assessments, incidents, and compliance items...');
                    // Create test assessment
                    return [4 /*yield*/, prisma.assessmentResult.create({
                            data: {
                                residentId: testResident.id,
                                type: 'FUNCTIONAL',
                                score: 85,
                                conductedBy: caregiverUser.id,
                                conductedAt: new Date(),
                                notes: 'Resident is doing well overall',
                                recommendations: 'Continue current care plan',
                                status: 'COMPLETED',
                                data: {
                                    adlScore: 90,
                                    mobilityScore: 80,
                                    cognitiveScore: 85,
                                    behavioralScore: 90,
                                },
                            },
                        })];
                case 13:
                    // Create test assessment
                    _a.sent();
                    // Create test incident
                    return [4 /*yield*/, prisma.residentIncident.create({
                            data: {
                                residentId: testResident.id,
                                type: 'FALL',
                                severity: 'MINOR',
                                description: 'Resident had a minor fall in the hallway',
                                occurredAt: new Date(),
                                reportedBy: caregiverUser.id,
                                reportedAt: new Date(),
                                status: 'RESOLVED',
                                actionsTaken: 'Resident was assessed by nurse, no injuries',
                                resolutionNotes: 'No follow-up required',
                                resolvedAt: new Date(),
                                resolvedBy: operatorUser.id,
                                followUpRequired: false,
                            },
                        })];
                case 14:
                    // Create test incident
                    _a.sent();
                    // Create test compliance item
                    return [4 /*yield*/, prisma.residentComplianceItem.create({
                            data: {
                                residentId: testResident.id,
                                type: 'MEDICAL_RECORDS',
                                title: 'Annual Physical Exam',
                                status: 'CURRENT',
                                issuedDate: new Date('2024-01-15'),
                                expiryDate: new Date('2025-01-15'),
                                documentUrl: 'https://example.com/documents/physical-exam.pdf',
                                verifiedBy: operatorUser.id,
                                verifiedAt: new Date(),
                            },
                        })];
                case 15:
                    // Create test compliance item
                    _a.sent();
                    console.log('✅ Test data created successfully');
                    console.log('\n🎉 Test users seed completed!\n');
                    console.log('Test Credentials:');
                    console.log('  Admin: admin.test@carelinkai.com / TestPassword123!');
                    console.log('  Operator: operator.test@carelinkai.com / TestPassword123!');
                    console.log('  Caregiver: caregiver.test@carelinkai.com / TestPassword123!');
                    console.log('  Family: family.test@carelinkai.com / TestPassword123!\n');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('Error seeding test users:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
