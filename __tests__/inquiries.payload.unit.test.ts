import { buildInquiryPayload, InquiryFormState } from "@/lib/inquiries/payload";
import { createInquirySchema } from "@/lib/inquiries/schema";

const fullForm: InquiryFormState = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "(216) 555-0100",
  residentName: "Robert Doe",
  moveInTimeframe: "1-3 months",
  careNeeded: ["Assisted Living", "Medication Management"],
  message: "Looking for a room with a garden view.",
};

describe("buildInquiryPayload", () => {
  it("maps form fields onto the canonical API field names", () => {
    const payload = buildInquiryPayload("home_123", fullForm, "2026-07-01T15:00:00.000Z");

    expect(payload).toMatchObject({
      homeId: "home_123",
      contactName: "Jane Doe",
      contactEmail: "jane@example.com",
      contactPhone: "(216) 555-0100",
      careRecipientName: "Robert Doe",
      careNeeds: ["Assisted Living", "Medication Management"],
      message: "Looking for a room with a garden view.",
      source: "WEBSITE",
    });
    // moveInTimeframe has no column on Inquiry, so it is preserved here.
    expect(payload.additionalInfo).toContain("1-3 months");
  });

  it("produces a payload that passes the real /api/inquiries Zod schema", () => {
    const payload = buildInquiryPayload("home_123", fullForm, undefined);
    const result = createInquirySchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("validates even when optional fields (phone, resident name) are blank", () => {
    const minimal: InquiryFormState = {
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "",
      residentName: "",
      moveInTimeframe: "",
      careNeeded: ["Assisted Living"],
      message: "",
    };
    const payload = buildInquiryPayload("home_123", minimal);

    expect(payload.contactPhone).toBeUndefined();
    expect(payload.careRecipientName).toBeUndefined();
    expect(payload.additionalInfo).toBeUndefined();
    expect(createInquirySchema.safeParse(payload).success).toBe(true);
  });

  it("rejects the OLD (pre-fix) form shape — proving the bug it fixes", () => {
    const legacyPayload = {
      homeId: "home_123",
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "(216) 555-0100",
      residentName: "Robert Doe",
      careNeeded: ["Assisted Living"],
      source: "home_detail",
    };
    const result = createInquirySchema.safeParse(legacyPayload as any);
    // contactName/contactEmail missing + invalid source enum → 400.
    expect(result.success).toBe(false);
  });
});
