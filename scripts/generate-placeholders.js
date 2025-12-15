"use strict";
/**
 * Script to generate and upload placeholder images to Cloudinary
 *
 * This script creates placeholder images for profiles, caregivers, and providers
 * and uploads them to Cloudinary under the "carelinkai/placeholders" folder.
 *
 * Run with: npx ts-node scripts/generate-placeholders.ts
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
var cloudinary_1 = require("cloudinary");
var canvas_1 = require("canvas");
var dotenv = require("dotenv");
var fs = require("fs");
// Load environment variables
dotenv.config({ path: '.env' });
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env['CLOUDINARY_CLOUD_NAME'],
    api_key: process.env['CLOUDINARY_API_KEY'],
    api_secret: process.env['CLOUDINARY_API_SECRET'],
    secure: true,
});
var placeholders = [
    // Profile placeholders (neutral colors)
    { name: 'profile-default', color: '#6366F1', initials: 'U', category: 'profile' },
    { name: 'profile-male', color: '#3B82F6', initials: 'M', category: 'profile' },
    { name: 'profile-female', color: '#EC4899', initials: 'F', category: 'profile' },
    { name: 'profile-admin', color: '#8B5CF6', initials: 'A', category: 'profile' },
    // Caregiver placeholders (warm, caring colors)
    { name: 'caregiver-default', color: '#10B981', initials: 'C', category: 'caregiver' },
    { name: 'caregiver-nurse', color: '#14B8A6', initials: 'N', category: 'caregiver' },
    { name: 'caregiver-aide', color: '#06B6D4', initials: 'CA', category: 'caregiver' },
    // Provider placeholders (professional colors)
    { name: 'provider-default', color: '#F59E0B', initials: 'P', category: 'provider' },
    { name: 'provider-medical', color: '#EF4444', initials: 'MD', category: 'provider' },
    { name: 'provider-facility', color: '#6366F1', initials: 'F', category: 'provider' },
];
function generatePlaceholderImage(config) {
    var size = 400; // 400x400 px
    var canvas = (0, canvas_1.createCanvas)(size, size);
    var ctx = canvas.getContext('2d');
    // Draw background circle
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    // Draw initials
    ctx.fillStyle = '#FFFFFF';
    ctx.font = "bold ".concat(size / 3, "px Arial");
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.initials, size / 2, size / 2);
    return canvas.toBuffer('image/png');
}
function uploadPlaceholders() {
    return __awaiter(this, void 0, void 0, function () {
        var results, _loop_1, _i, placeholders_1, config, successful, failed, outputPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🚀 Starting placeholder generation and upload...\n');
                    results = [];
                    _loop_1 = function (config) {
                        var buffer_1, result, error_1, errorMsg;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 2, , 3]);
                                    console.log("\uD83C\uDFA8 Generating ".concat(config.name, "..."));
                                    buffer_1 = generatePlaceholderImage(config);
                                    console.log("\u2B06\uFE0F  Uploading to Cloudinary...");
                                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                                            var uploadStream = cloudinary_1.v2.uploader.upload_stream({
                                                folder: "carelinkai/placeholders/".concat(config.category),
                                                public_id: config.name,
                                                resource_type: 'image',
                                                overwrite: true,
                                            }, function (error, result) {
                                                if (error)
                                                    reject(error);
                                                else
                                                    resolve(result);
                                            });
                                            uploadStream.end(buffer_1);
                                        })];
                                case 1:
                                    result = _b.sent();
                                    results.push({
                                        name: config.name,
                                        category: config.category,
                                        publicId: result.public_id,
                                        url: result.secure_url,
                                        success: true,
                                    });
                                    console.log("   \u2705 Success! URL: ".concat(result.secure_url, "\n"));
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_1 = _b.sent();
                                    errorMsg = error_1 instanceof Error ? error_1.message : String(error_1);
                                    results.push({
                                        name: config.name,
                                        category: config.category,
                                        publicId: '',
                                        url: '',
                                        success: false,
                                        error: errorMsg,
                                    });
                                    console.error("   \u274C Failed: ".concat(errorMsg, "\n"));
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, placeholders_1 = placeholders;
                    _a.label = 1;
                case 1:
                    if (!(_i < placeholders_1.length)) return [3 /*break*/, 4];
                    config = placeholders_1[_i];
                    return [5 /*yield**/, _loop_1(config)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    // Print summary
                    console.log('\n' + '='.repeat(60));
                    console.log('📊 UPLOAD SUMMARY');
                    console.log('='.repeat(60) + '\n');
                    successful = results.filter(function (r) { return r.success; });
                    failed = results.filter(function (r) { return !r.success; });
                    console.log("\u2705 Successful: ".concat(successful.length, "/").concat(results.length));
                    console.log("\u274C Failed: ".concat(failed.length, "/").concat(results.length, "\n"));
                    if (successful.length > 0) {
                        console.log('✅ SUCCESSFUL UPLOADS BY CATEGORY:');
                        console.log('─'.repeat(60));
                        ['profile', 'caregiver', 'provider'].forEach(function (category) {
                            var categoryResults = successful.filter(function (r) { return r.category === category; });
                            if (categoryResults.length > 0) {
                                console.log("\n".concat(category.toUpperCase(), ":"));
                                categoryResults.forEach(function (r) {
                                    console.log("  ".concat(r.name.padEnd(25), " \u2192 ").concat(r.url));
                                });
                            }
                        });
                        console.log('');
                    }
                    if (failed.length > 0) {
                        console.log('❌ FAILED UPLOADS:');
                        console.log('─'.repeat(60));
                        failed.forEach(function (r) {
                            console.log("".concat(r.name.padEnd(25), " \u2192 ").concat(r.error));
                        });
                        console.log('');
                    }
                    outputPath = 'scripts/cloudinary-placeholder-uploads.json';
                    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
                    console.log("\uD83D\uDCBE Results saved to: ".concat(outputPath, "\n"));
                    return [2 /*return*/];
            }
        });
    });
}
// Run the upload
uploadPlaceholders()
    .then(function () {
    console.log('✨ Placeholder generation and upload completed!\n');
    process.exit(0);
})
    .catch(function (error) {
    console.error('💥 Process failed:', error);
    process.exit(1);
});
