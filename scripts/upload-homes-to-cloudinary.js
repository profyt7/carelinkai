"use strict";
/**
 * Script to upload home images to Cloudinary
 *
 * This script uploads all home images from /public/images/homes/
 * to Cloudinary under the "carelinkai/homes" folder.
 *
 * Run with: npx ts-node scripts/upload-homes-to-cloudinary.ts
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
var fs = require("fs");
var path = require("path");
var dotenv = require("dotenv");
// Load environment variables
dotenv.config({ path: '.env' });
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env['CLOUDINARY_CLOUD_NAME'],
    api_key: process.env['CLOUDINARY_API_KEY'],
    api_secret: process.env['CLOUDINARY_API_SECRET'],
    secure: true,
});
function uploadHomeImages() {
    return __awaiter(this, void 0, void 0, function () {
        var imagesDir, results, files, _i, files_1, file, filePath, fileNameWithoutExt, result, error_1, errorMsg, successful, failed, outputPath, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🚀 Starting Cloudinary home images upload...\n');
                    imagesDir = path.join(process.cwd(), 'public/images/homes');
                    results = [];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    // Check if directory exists
                    if (!fs.existsSync(imagesDir)) {
                        throw new Error("Images directory not found: ".concat(imagesDir));
                    }
                    files = fs.readdirSync(imagesDir).filter(function (file) {
                        return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
                    });
                    console.log("\uD83D\uDCC1 Found ".concat(files.length, " images to upload\n"));
                    _i = 0, files_1 = files;
                    _a.label = 2;
                case 2:
                    if (!(_i < files_1.length)) return [3 /*break*/, 7];
                    file = files_1[_i];
                    filePath = path.join(imagesDir, file);
                    fileNameWithoutExt = path.parse(file).name;
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    console.log("\u2B06\uFE0F  Uploading ".concat(file, "..."));
                    return [4 /*yield*/, cloudinary_1.v2.uploader.upload(filePath, {
                            folder: 'carelinkai/homes',
                            public_id: "home-".concat(fileNameWithoutExt),
                            resource_type: 'image',
                            transformation: [
                                { width: 1200, height: 800, crop: 'fill', quality: 'auto' },
                            ],
                            overwrite: true, // Overwrite if already exists
                        })];
                case 4:
                    result = _a.sent();
                    results.push({
                        filename: file,
                        publicId: result.public_id,
                        url: result.url,
                        secureUrl: result.secure_url,
                        success: true,
                    });
                    console.log("   \u2705 Success! Public ID: ".concat(result.public_id));
                    console.log("   \uD83D\uDD17 URL: ".concat(result.secure_url, "\n"));
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    errorMsg = error_1 instanceof Error ? error_1.message : String(error_1);
                    results.push({
                        filename: file,
                        publicId: '',
                        url: '',
                        secureUrl: '',
                        success: false,
                        error: errorMsg,
                    });
                    console.error("   \u274C Failed: ".concat(errorMsg, "\n"));
                    return [3 /*break*/, 6];
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7:
                    // Print summary
                    console.log('\n' + '='.repeat(60));
                    console.log('📊 UPLOAD SUMMARY');
                    console.log('='.repeat(60) + '\n');
                    successful = results.filter(function (r) { return r.success; });
                    failed = results.filter(function (r) { return !r.success; });
                    console.log("\u2705 Successful: ".concat(successful.length, "/").concat(results.length));
                    console.log("\u274C Failed: ".concat(failed.length, "/").concat(results.length, "\n"));
                    if (successful.length > 0) {
                        console.log('✅ SUCCESSFUL UPLOADS:');
                        console.log('─'.repeat(60));
                        successful.forEach(function (r) {
                            console.log("".concat(r.filename.padEnd(15), " \u2192 ").concat(r.publicId));
                        });
                        console.log('');
                    }
                    if (failed.length > 0) {
                        console.log('❌ FAILED UPLOADS:');
                        console.log('─'.repeat(60));
                        failed.forEach(function (r) {
                            console.log("".concat(r.filename.padEnd(15), " \u2192 ").concat(r.error));
                        });
                        console.log('');
                    }
                    outputPath = path.join(process.cwd(), 'scripts/cloudinary-home-uploads.json');
                    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
                    console.log("\uD83D\uDCBE Results saved to: ".concat(outputPath, "\n"));
                    // Generate mock data template
                    if (successful.length > 0) {
                        console.log('📝 CLOUDINARY URLS FOR MOCK DATA:');
                        console.log('─'.repeat(60));
                        console.log('Copy these URLs to your mock data files:\n');
                        successful.forEach(function (r, index) {
                            console.log("  \"".concat(r.secureUrl, "\","));
                        });
                        console.log('');
                    }
                    return [3 /*break*/, 9];
                case 8:
                    error_2 = _a.sent();
                    console.error('❌ Fatal error:', error_2);
                    process.exit(1);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
// Run the upload
uploadHomeImages()
    .then(function () {
    console.log('✨ Upload process completed!\n');
    process.exit(0);
})
    .catch(function (error) {
    console.error('💥 Upload process failed:', error);
    process.exit(1);
});
