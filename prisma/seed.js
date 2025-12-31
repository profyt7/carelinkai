"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
/**
 * Database Seed Script for CareLinkAI
 * Seeds marketplace taxonomy only.
 */
var client_1 = require("@prisma/client");
var bcryptjs_1 = require("bcryptjs");
var prisma = new client_1.PrismaClient();
function seedMarketplaceTaxonomy() {
    return __awaiter(this, void 0, void 0, function () {
        var groups, _i, groups_1, group, sort, _a, _b, name_1, slug;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('Seeding marketplace taxonomy...');
                    groups = [
                        {
                            type: 'SETTING',
                            names: ['In-home', 'Assisted Living', 'Independent Living', 'Memory Care', 'Senior Living Community'],
                        },
                        {
                            type: 'CARE_TYPE',
                            names: ['Companion Care', 'Personal Care', "Dementia/Alzheimer's", 'Hospice Support', 'Post-Surgery Support', 'Special Needs Adult Care', 'Respite Care'],
                        },
                        {
                            type: 'SERVICE',
                            names: ['Transportation', 'Errands', 'Household Tasks', 'Medication Prompting', 'Mobility Assistance'],
                        },
                        {
                            type: 'SPECIALTY',
                            names: ['Companionship', 'Dementia Care'],
                        },
                    ];
                    _i = 0, groups_1 = groups;
                    _c.label = 1;
                case 1:
                    if (!(_i < groups_1.length)) return [3 /*break*/, 6];
                    group = groups_1[_i];
                    sort = 1;
                    _a = 0, _b = group.names;
                    _c.label = 2;
                case 2:
                    if (!(_a < _b.length)) return [3 /*break*/, 5];
                    name_1 = _b[_a];
                    slug = name_1.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    return [4 /*yield*/, prisma.marketplaceCategory.upsert({
                            where: { slug: slug },
                            update: { name: name_1, type: group.type, sortOrder: sort, isActive: true },
                            create: { name: name_1, slug: slug, type: group.type, sortOrder: sort, isActive: true },
                        })];
                case 3:
                    _c.sent();
                    sort += 1;
                    _c.label = 4;
                case 4:
                    _a++;
                    return [3 /*break*/, 2];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    console.log('Marketplace taxonomy seeded');
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Ensure a development ADMIN user exists
 */
function upsertAdminUser() {
    return __awaiter(this, void 0, void 0, function () {
        var email, rawPassword, passwordHash, admin;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    email = (_a = process.env.ADMIN_EMAIL) !== null && _a !== void 0 ? _a : 'admin@carelinkai.com';
                    rawPassword = (_b = process.env.ADMIN_PASSWORD) !== null && _b !== void 0 ? _b : 'Admin123!';
                    return [4 /*yield*/, bcryptjs_1.default.hash(rawPassword, 10)];
                case 1:
                    passwordHash = _c.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: email },
                            update: {
                                passwordHash: passwordHash,
                                status: client_1.UserStatus.ACTIVE,
                            },
                            create: {
                                email: email,
                                firstName: 'Admin',
                                lastName: 'User',
                                passwordHash: passwordHash,
                                role: client_1.UserRole.ADMIN,
                                status: client_1.UserStatus.ACTIVE,
                            },
                        })];
                case 2:
                    admin = _c.sent();
                    console.log("Admin user ready: ".concat(admin.email, " (").concat(admin.id, ")"));
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Ensure a development DISCHARGE_PLANNER user exists
 */
function upsertDischargePlannerUser() {
    return __awaiter(this, void 0, void 0, function () {
        var email, rawPassword, passwordHash, dischargePlanner;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    email = (_a = process.env.DISCHARGE_PLANNER_EMAIL) !== null && _a !== void 0 ? _a : 'demo.discharge@carelinkai.com';
                    rawPassword = (_b = process.env.DISCHARGE_PLANNER_PASSWORD) !== null && _b !== void 0 ? _b : 'Demo123!';
                    return [4 /*yield*/, bcryptjs_1.default.hash(rawPassword, 10)];
                case 1:
                    passwordHash = _c.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: email },
                            update: {
                                passwordHash: passwordHash,
                                status: client_1.UserStatus.ACTIVE,
                                emailVerified: new Date(),
                            },
                            create: {
                                email: email,
                                firstName: 'Demo',
                                lastName: 'Discharge Planner',
                                passwordHash: passwordHash,
                                role: client_1.UserRole.DISCHARGE_PLANNER,
                                status: client_1.UserStatus.ACTIVE,
                                emailVerified: new Date(),
                            },
                        })];
                case 2:
                    dischargePlanner = _c.sent();
                    console.log("Discharge Planner user ready: ".concat(dischargePlanner.email, " (").concat(dischargePlanner.id, ")"));
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Starting database seed process...');
                    return [4 /*yield*/, seedMarketplaceTaxonomy()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, upsertAdminUser()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, upsertDischargePlannerUser()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, seedMockCaregivers(12)];
                case 4:
                    _a.sent();
                    // ---------------- Mock family job listings ----------------
                    return [4 /*yield*/, seedMockFamilyJobs(15)];
                case 5:
                    // ---------------- Mock family job listings ----------------
                    _a.sent();
                    // ---------------- Mock caregiver reviews ----------------
                    return [4 /*yield*/, seedMockCaregiverReviews()];
                case 6:
                    // ---------------- Mock caregiver reviews ----------------
                    _a.sent();
                    console.log('Seed complete');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) { console.error('Error during seeding:', e); process.exit(1); })
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
    switch (_a.label) {
        case 0: return [4 /*yield*/, prisma.$disconnect()];
        case 1:
            _a.sent();
            return [2 /*return*/];
    }
}); }); });
/**
 * Seed mock caregiver users & profiles for development/demo
 */
function seedMockCaregivers() {
    return __awaiter(this, arguments, void 0, function (count) {
        var specialtySlugs, cats, _a, firstNames, lastNames, streets, cities, states, zips, defaultPassword, passwordHash, i, first, last, email, gender, avatarIdx, profileImageUrl, user, addrIdx;
        var _b;
        if (count === void 0) { count = 12; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("Seeding ".concat(count, " mock caregivers..."));
                    specialtySlugs = [];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, prisma.marketplaceCategory.findMany({
                            where: { type: 'SPECIALTY', isActive: true },
                            orderBy: { sortOrder: 'asc' },
                        })];
                case 2:
                    cats = _c.sent();
                    specialtySlugs = cats.map(function (c) { return c.slug; });
                    return [3 /*break*/, 4];
                case 3:
                    _a = _c.sent();
                    specialtySlugs = [
                        'alzheimers-care',
                        'dementia-care',
                        'diabetes-care',
                        'hospice-care',
                        'medication-management',
                        'mobility-assistance',
                    ];
                    return [3 /*break*/, 4];
                case 4:
                    firstNames = [
                        'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James', 'Isabella', 'Logan',
                        'Charlotte', 'Benjamin', 'Amelia', 'Mason', 'Harper', 'Elijah', 'Evelyn', 'Oliver', 'Abigail', 'Jacob',
                    ];
                    lastNames = [
                        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
                        'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
                        'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
                    ];
                    streets = ['123 Main St', '45 Oak Ave', '78 Pine Rd', '233 Maple St', '67 Cedar Ln', '890 Birch Blvd'];
                    cities = ['San Francisco', 'Oakland', 'San Jose', 'Berkeley', 'Palo Alto', 'Mountain View', 'Sunnyvale'];
                    states = ['CA'];
                    zips = ['94102', '94607', '95112', '94704', '94301', '94043', '94086'];
                    defaultPassword = (_b = process.env.MOCK_USER_PASSWORD) !== null && _b !== void 0 ? _b : 'Care123!';
                    return [4 /*yield*/, bcryptjs_1.default.hash(defaultPassword, 10)];
                case 5:
                    passwordHash = _c.sent();
                    i = 0;
                    _c.label = 6;
                case 6:
                    if (!(i < count)) return [3 /*break*/, 11];
                    first = firstNames[Math.floor(Math.random() * firstNames.length)];
                    last = lastNames[Math.floor(Math.random() * lastNames.length)];
                    email = "".concat(first.toLowerCase(), ".").concat(last.toLowerCase(), ".").concat(i + 1, "@example.com");
                    gender = Math.random() < 0.5 ? 'women' : 'men';
                    avatarIdx = Math.floor(Math.random() * 90);
                    profileImageUrl = "https://randomuser.me/api/portraits/".concat(gender, "/").concat(avatarIdx, ".jpg");
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: email },
                            update: {
                                firstName: first,
                                lastName: last,
                                role: 'CAREGIVER',
                                status: 'ACTIVE',
                                passwordHash: passwordHash,
                                profileImageUrl: profileImageUrl,
                            },
                            create: {
                                email: email,
                                firstName: first,
                                lastName: last,
                                role: 'CAREGIVER',
                                status: 'ACTIVE',
                                passwordHash: passwordHash,
                                profileImageUrl: profileImageUrl,
                            },
                        })];
                case 7:
                    user = _c.sent();
                    addrIdx = Math.floor(Math.random() * cities.length);
                    return [4 /*yield*/, prisma.address.create({
                            data: {
                                userId: user.id,
                                street: streets[Math.floor(Math.random() * streets.length)],
                                city: cities[addrIdx],
                                state: states[0],
                                zipCode: zips[addrIdx],
                                country: 'USA',
                            },
                        }).catch(function () { })];
                case 8:
                    _c.sent();
                    // caregiver profile
                    return [4 /*yield*/, prisma.caregiver.upsert({
                            where: { userId: user.id },
                            update: {
                                specialties: {
                                    set: (function () {
                                        var shuffled = __spreadArray([], specialtySlugs, true).sort(function () { return 0.5 - Math.random(); });
                                        return shuffled.slice(0, Math.min(3, shuffled.length));
                                    })(),
                                },
                                settings: { set: [] },
                                careTypes: { set: [] },
                            },
                            create: {
                                userId: user.id,
                                bio: 'Compassionate caregiver with experience supporting seniors across various needs.',
                                yearsExperience: Math.floor(Math.random() * 15) + 1,
                                hourlyRate: Math.floor(Math.random() * 20) + 20, // $20-40/hr
                                backgroundCheckStatus: 'CLEAR',
                                specialties: (function () {
                                    var shuffled = __spreadArray([], specialtySlugs, true).sort(function () { return 0.5 - Math.random(); });
                                    return shuffled.slice(0, Math.min(3, shuffled.length));
                                })(),
                                settings: [],
                                careTypes: [],
                            },
                        })];
                case 9:
                    // caregiver profile
                    _c.sent();
                    _c.label = 10;
                case 10:
                    i++;
                    return [3 /*break*/, 6];
                case 11:
                    console.log('Mock caregivers seeded.');
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Seed mock family job listings
 */
function seedMockFamilyJobs() {
    return __awaiter(this, arguments, void 0, function (count) {
        var _a, settings, careTypes, services, specialties, settingSlugs, careTypeSlugs, serviceSlugs, specialtySlugs, titles, descriptions, cities, states, rand, pick, pickMany, familyUserIds, defaultPassword, passwordHash, familyCount, i, email, user, i, postedByUserId, city, state, hourlyMin, hourlyMax, start, end;
        var _b, _c, _d, _e;
        if (count === void 0) { count = 15; }
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    console.log("Seeding ".concat(count, " mock family job listings..."));
                    return [4 /*yield*/, Promise.all([
                            prisma.marketplaceCategory.findMany({ where: { type: 'SETTING', isActive: true }, orderBy: { sortOrder: 'asc' } }),
                            prisma.marketplaceCategory.findMany({ where: { type: 'CARE_TYPE', isActive: true }, orderBy: { sortOrder: 'asc' } }),
                            prisma.marketplaceCategory.findMany({ where: { type: 'SERVICE', isActive: true }, orderBy: { sortOrder: 'asc' } }),
                            prisma.marketplaceCategory.findMany({ where: { type: 'SPECIALTY', isActive: true }, orderBy: { sortOrder: 'asc' } }),
                        ])];
                case 1:
                    _a = _f.sent(), settings = _a[0], careTypes = _a[1], services = _a[2], specialties = _a[3];
                    settingSlugs = settings.map(function (c) { return c.slug; });
                    careTypeSlugs = careTypes.map(function (c) { return c.slug; });
                    serviceSlugs = services.map(function (c) { return c.slug; });
                    specialtySlugs = specialties.map(function (c) { return c.slug; });
                    titles = [
                        'Evening caregiver for mom',
                        'Weekend companion needed',
                        'Overnight dementia care',
                        'Post-surgery recovery assistance',
                        'Medication & housekeeping help',
                        'Errands and transport support',
                        'Part-time daytime caregiver',
                        'Memory care support required',
                        'Short-term respite care',
                        'Daily living assistance',
                    ];
                    descriptions = [
                        'Looking for a compassionate caregiver to assist with ADLs and companionship.',
                        'Seeking experienced caregiver with memory-care background; reliable and patient.',
                        'Need help with medication reminders, mobility assistance, and light housekeeping.',
                        'Support with bathing, dressing, meals, and transportation to appointments.',
                        'Family seeking weekend coverage; flexible hours available.',
                    ];
                    cities = ['San Francisco', 'Oakland', 'San Jose', 'Berkeley', 'Palo Alto', 'Mountain View', 'Sunnyvale'];
                    states = ['CA'];
                    rand = function (n) { return Math.floor(Math.random() * n); };
                    pick = function (arr) { return (arr.length ? arr[rand(arr.length)] : undefined); };
                    pickMany = function (arr, k) {
                        var shuffled = __spreadArray([], arr, true).sort(function () { return 0.5 - Math.random(); });
                        return shuffled.slice(0, Math.min(k, shuffled.length));
                    };
                    familyUserIds = [];
                    defaultPassword = (_b = process.env.MOCK_USER_PASSWORD) !== null && _b !== void 0 ? _b : 'Care123!';
                    return [4 /*yield*/, bcryptjs_1.default.hash(defaultPassword, 10)];
                case 2:
                    passwordHash = _f.sent();
                    familyCount = Math.max(5, Math.ceil(count / 3));
                    i = 0;
                    _f.label = 3;
                case 3:
                    if (!(i < familyCount)) return [3 /*break*/, 6];
                    email = "family.demo".concat(i + 1, "@example.com");
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: email },
                            update: { role: 'FAMILY', status: 'ACTIVE', passwordHash: passwordHash },
                            create: {
                                email: email,
                                firstName: 'Family',
                                lastName: "Demo".concat(i + 1),
                                role: 'FAMILY',
                                status: 'ACTIVE',
                                passwordHash: passwordHash,
                            },
                        })];
                case 4:
                    user = _f.sent();
                    familyUserIds.push(user.id);
                    _f.label = 5;
                case 5:
                    i++;
                    return [3 /*break*/, 3];
                case 6:
                    i = 0;
                    _f.label = 7;
                case 7:
                    if (!(i < count)) return [3 /*break*/, 10];
                    postedByUserId = pick(familyUserIds);
                    city = pick(cities);
                    state = pick(states);
                    hourlyMin = 20 + rand(10);
                    hourlyMax = hourlyMin + 5 + rand(10);
                    start = new Date();
                    start.setDate(start.getDate() + rand(21) + 2);
                    end = new Date(start);
                    end.setDate(start.getDate() + (rand(7) + 1));
                    return [4 /*yield*/, prisma.marketplaceListing.create({
                            data: {
                                postedByUserId: postedByUserId,
                                title: (_c = pick(titles)) !== null && _c !== void 0 ? _c : 'Caregiver needed',
                                description: (_d = pick(descriptions)) !== null && _d !== void 0 ? _d : 'Seeking reliable caregiver.',
                                hourlyRateMin: hourlyMin,
                                hourlyRateMax: hourlyMax,
                                setting: (_e = pick(settingSlugs)) !== null && _e !== void 0 ? _e : undefined,
                                careTypes: pickMany(careTypeSlugs, 2),
                                services: pickMany(serviceSlugs, 2),
                                specialties: pickMany(specialtySlugs, 3),
                                city: city,
                                state: state,
                                status: 'OPEN',
                                startTime: start,
                                endTime: end,
                            },
                        })];
                case 8:
                    _f.sent();
                    _f.label = 9;
                case 9:
                    i++;
                    return [3 /*break*/, 7];
                case 10:
                    console.log('Mock family job listings seeded.');
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Seed mock caregiver reviews
 * Creates 5-15 reviews for each caregiver with ratings between 3-5 stars
 */
function seedMockCaregiverReviews() {
    return __awaiter(this, void 0, void 0, function () {
        var caregivers, familyUsers, defaultPassword, passwordHash, neededCount, newFamilyUsers, i, userNumber, email, user, e_1, reviewComments, _i, caregivers_1, caregiver, reviewCount, reviewData, usedCombinations, i, reviewer, daysAgo, reviewDate, combinationKey, ratingRandom, rating, comment, e_2, totalReviews;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('Seeding mock caregiver reviews...');
                    return [4 /*yield*/, prisma.caregiver.findMany()];
                case 1:
                    caregivers = _b.sent();
                    if (caregivers.length === 0) {
                        console.log('No caregivers found, skipping review seeding');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, prisma.user.findMany({
                            where: { role: 'FAMILY', status: 'ACTIVE' },
                            select: { id: true, firstName: true, lastName: true },
                        })];
                case 2:
                    familyUsers = _b.sent();
                    if (!(familyUsers.length < 5)) return [3 /*break*/, 10];
                    console.log("Only ".concat(familyUsers.length, " FAMILY users found, creating additional ones..."));
                    defaultPassword = (_a = process.env.MOCK_USER_PASSWORD) !== null && _a !== void 0 ? _a : 'Care123!';
                    return [4 /*yield*/, bcryptjs_1.default.hash(defaultPassword, 10)];
                case 3:
                    passwordHash = _b.sent();
                    neededCount = 5 - familyUsers.length;
                    newFamilyUsers = [];
                    i = 0;
                    _b.label = 4;
                case 4:
                    if (!(i < neededCount)) return [3 /*break*/, 9];
                    userNumber = familyUsers.length + i + 1;
                    email = "family.reviewer".concat(userNumber, "@example.com");
                    _b.label = 5;
                case 5:
                    _b.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: email },
                            update: { role: 'FAMILY', status: 'ACTIVE' },
                            create: {
                                email: email,
                                firstName: 'Family',
                                lastName: "Reviewer".concat(userNumber),
                                role: 'FAMILY',
                                status: 'ACTIVE',
                                passwordHash: passwordHash,
                            },
                        })];
                case 6:
                    user = _b.sent();
                    newFamilyUsers.push({ id: user.id, firstName: user.firstName, lastName: user.lastName });
                    return [3 /*break*/, 8];
                case 7:
                    e_1 = _b.sent();
                    console.error("Failed to create family user ".concat(email, ":"), e_1);
                    return [3 /*break*/, 8];
                case 8:
                    i++;
                    return [3 /*break*/, 4];
                case 9:
                    familyUsers = __spreadArray(__spreadArray([], familyUsers, true), newFamilyUsers, true);
                    _b.label = 10;
                case 10:
                    reviewComments = [
                        'Excellent caregiver, very attentive and professional.',
                        'Provided outstanding care for my parent, highly recommend!',
                        'Reliable, punctual, and compassionate. Would hire again.',
                        'Very knowledgeable about senior care needs.',
                        'Great communication skills and genuinely caring attitude.',
                        'Went above and beyond expectations.',
                        'My parent really enjoyed their company and care.',
                        'Handled challenging situations with patience and grace.',
                        'Very responsive and adaptable to changing needs.',
                        'Excellent at medication management and reminders.',
                        'Kept our home clean and organized while providing care.',
                        'Prepared nutritious meals that my parent enjoyed.',
                        'Great at engaging in meaningful activities.',
                        'Professional demeanor while maintaining a personal touch.',
                        'Skilled at mobility assistance and transfer techniques.',
                        'Provided peace of mind for our family.',
                        'Excellent driving record and transportation assistance.',
                        'Very respectful of privacy and dignity.',
                        'Good at encouraging independence while providing necessary support.',
                        'Handled memory care needs with expertise and compassion.',
                    ];
                    _i = 0, caregivers_1 = caregivers;
                    _b.label = 11;
                case 11:
                    if (!(_i < caregivers_1.length)) return [3 /*break*/, 16];
                    caregiver = caregivers_1[_i];
                    reviewCount = 5 + Math.floor(Math.random() * 11);
                    reviewData = [];
                    usedCombinations = new Set();
                    for (i = 0; i < reviewCount; i++) {
                        reviewer = familyUsers[Math.floor(Math.random() * familyUsers.length)];
                        daysAgo = Math.floor(Math.random() * 365);
                        reviewDate = new Date();
                        reviewDate.setDate(reviewDate.getDate() - daysAgo);
                        combinationKey = "".concat(caregiver.id, "-").concat(reviewer.id, "-").concat(reviewDate.toISOString().split('T')[0]);
                        // Skip if this combination already exists
                        if (usedCombinations.has(combinationKey)) {
                            continue;
                        }
                        usedCombinations.add(combinationKey);
                        ratingRandom = Math.random();
                        rating = void 0;
                        if (ratingRandom < 0.1) {
                            rating = 3;
                        }
                        else if (ratingRandom < 0.4) {
                            rating = 4;
                        }
                        else {
                            rating = 5;
                        }
                        comment = reviewComments[Math.floor(Math.random() * reviewComments.length)];
                        reviewData.push({
                            caregiverId: caregiver.id,
                            reviewerId: reviewer.id,
                            rating: rating,
                            content: comment,
                            createdAt: reviewDate,
                            updatedAt: reviewDate,
                        });
                    }
                    if (!(reviewData.length > 0)) return [3 /*break*/, 15];
                    _b.label = 12;
                case 12:
                    _b.trys.push([12, 14, , 15]);
                    return [4 /*yield*/, prisma.caregiverReview.createMany({
                            data: reviewData,
                            skipDuplicates: true,
                        })];
                case 13:
                    _b.sent();
                    console.log("Created ".concat(reviewData.length, " reviews for caregiver ").concat(caregiver.id));
                    return [3 /*break*/, 15];
                case 14:
                    e_2 = _b.sent();
                    console.error("Failed to create reviews for caregiver ".concat(caregiver.id, ":"), e_2);
                    return [3 /*break*/, 15];
                case 15:
                    _i++;
                    return [3 /*break*/, 11];
                case 16: return [4 /*yield*/, prisma.caregiverReview.count()];
                case 17:
                    totalReviews = _b.sent();
                    console.log("Total caregiver reviews in database: ".concat(totalReviews));
                    return [2 /*return*/];
            }
        });
    });
}
