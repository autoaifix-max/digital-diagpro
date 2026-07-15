import { describe, expect, it } from "vitest";
import {
  approvalDecisionSchema,
  approvalRequestSchema,
  customerCreateSchema,
  publicBookingSchema,
  qualityCheckSchema,
  saudiPhoneSchema,
  serviceCreateSchema,
  vehicleCreateSchema,
  walkInIntakeSchema,
  workOrderDetailsSchema,
  staffCreateSchema,
  staffPatchSchema,
} from "./validators";
import { cloneDefaultQualityChecklist } from "./quality";

describe("saudiPhoneSchema", () => {
  it.each([
    ["0501234567", "+966501234567"],
    ["501234567", "+966501234567"],
    ["966501234567", "+966501234567"],
  ])("normalizes %s", (input, expected) => {
    expect(saudiPhoneSchema.parse(input)).toBe(expected);
  });

  it("rejects invalid numbers", () => {
    expect(() => saudiPhoneSchema.parse("123")).toThrow();
  });
});

describe("publicBookingSchema", () => {
  it("accepts a valid booking", () => {
    const result = publicBookingSchema.parse({
      customerName: "أحمد محمد",
      phone: "0501234567",
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      vehicleYear: 2019,
      plateNumber: "أ ب ج 1234",
      serviceCode: "computer-diagnostic",
      complaint: "تقطيع على الوقوف وظهور لمبة المحرك",
      preferredDate: "2026-07-20",
      preferredTime: "10:30",
      consent: true,
    });

    expect(result.phone).toBe("+966501234567");
  });
});

describe("customer and vehicle schemas", () => {
  it("normalizes a customer phone and accepts an optional email", () => {
    const result = customerCreateSchema.parse({ fullName: "محمد علي", phone: "0551234567", email: "customer@example.com", notes: "عميل تجريبي" });
    expect(result.phone).toBe("+966551234567");
  });

  it("accepts a complete vehicle", () => {
    const result = vehicleCreateSchema.parse({
      customerId: "11111111-1111-4111-8111-111111111111",
      make: "Toyota",
      model: "Camry",
      modelYear: 2020,
      vin: "4T1G11AK0LU123456",
      plateNumber: "أ ب ج 1234",
      engine: "2.5L",
      color: "أبيض",
      mileage: "120000",
      notes: "",
    });
    expect(result.mileage).toBe(120000);
  });

  it("rejects a short VIN", () => {
    expect(() => vehicleCreateSchema.parse({ customerId: "11111111-1111-4111-8111-111111111111", make: "Kia", model: "K5", modelYear: 2022, vin: "1234" })).toThrow();
  });
});

describe("service schema", () => {
  it("accepts price, duration, and stable service code", () => {
    const result = serviceCreateSchema.parse({ code: "confirmatory-diagnosis", nameAr: "تشخيص تأكيدي", descriptionAr: "عزل السبب", basePrice: "149", estimatedMinutes: "60", sortOrder: 2 });
    expect(result.basePrice).toBe(149);
    expect(result.estimatedMinutes).toBe(60);
  });

  it("rejects spaces and uppercase in service code", () => {
    expect(() => serviceCreateSchema.parse({ code: "Bad Code", nameAr: "خدمة", basePrice: "", estimatedMinutes: "", sortOrder: 1 })).toThrow();
  });
});

describe("approval schemas", () => {
  it("accepts a request with amount and channel", () => {
    const result = approvalRequestSchema.parse({ workOrderId: "11111111-1111-4111-8111-111111111111", requestedAmount: "850", itemsSummary: "إصلاح الضفيرة واستبدال الفيشة", channel: "whatsapp", customerVisible: true });
    expect(result.requestedAmount).toBe(850);
  });

  it("accepts a documented staff decision", () => {
    expect(approvalDecisionSchema.parse({ status: "approved", channel: "phone", responseNote: "وافق العميل" }).status).toBe("approved");
  });
});

describe("quality check schema", () => {
  it("accepts the standard checklist as a draft", () => {
    const result = qualityCheckSchema.parse({ workOrderId: "11111111-1111-4111-8111-111111111111", status: "draft", checklist: cloneDefaultQualityChecklist(), notes: "" });
    expect(result.checklist).toHaveLength(6);
  });

  it("rejects invalid checklist result values", () => {
    const checklist = cloneDefaultQualityChecklist() as unknown as Array<Record<string, unknown>>;
    checklist[0].result = "unknown";
    expect(() => qualityCheckSchema.parse({ workOrderId: "11111111-1111-4111-8111-111111111111", status: "passed", checklist, notes: "" })).toThrow();
  });
});


describe("walk-in intake schema", () => {
  it("accepts a complete walk-in intake and normalizes the phone", () => {
    const result = walkInIntakeSchema.parse({
      customerName: "عميل حضوري",
      phone: "0509876543",
      email: "",
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      vehicleYear: 2019,
      vin: "",
      plateNumber: "أ ب ج 1234",
      serviceCode: "computer-diagnostic",
      complaint: "تقطيع واضح على الوقوف",
      priority: "urgent",
      odometerIn: "120000",
      fuelLevelPercent: "50",
      promisedAt: "",
    });
    expect(result.phone).toBe("+966509876543");
    expect(result.odometerIn).toBe(120000);
    expect(result.fuelLevelPercent).toBe(50);
  });

  it("rejects fuel percentages above 100", () => {
    expect(() => walkInIntakeSchema.parse({
      customerName: "عميل",
      phone: "0509876543",
      vehicleMake: "Kia",
      vehicleModel: "K5",
      vehicleYear: 2022,
      serviceCode: "computer-diagnostic",
      complaint: "شكوى واضحة للاختبار",
      fuelLevelPercent: "150",
    })).toThrow();
  });
});

describe("work order details schema", () => {
  it("accepts assignment, intake values, and financial totals", () => {
    const result = workOrderDetailsSchema.parse({
      priority: "normal",
      assignedTo: "11111111-1111-4111-8111-111111111111",
      odometerIn: "100500",
      fuelLevelPercent: "75",
      promisedAt: "2026-07-20T18:30",
      laborTotal: "150",
      partsTotal: "50",
      discountTotal: "10",
      taxTotal: "28.5",
      approvalNote: "وافق العميل",
      internalNotes: "ملاحظة داخلية",
    });
    expect(result.laborTotal).toBe(150);
    expect(result.partsTotal).toBe(50);
  });

  it("rejects negative financial values", () => {
    expect(() => workOrderDetailsSchema.parse({ priority: "normal", laborTotal: -1, partsTotal: 0, discountTotal: 0, taxTotal: 0 })).toThrow();
  });
});

describe("staff schemas", () => {
  it("accepts a valid technician account", () => {
    expect(staffCreateSchema.parse({ fullName: "فني تجريبي", email: "tech@example.com", role: "technician" }).role).toBe("technician");
  });

  it("supports deactivating a staff profile", () => {
    expect(staffPatchSchema.parse({ fullName: "موظف تجريبي", role: "receptionist", isActive: false }).isActive).toBe(false);
  });
});
