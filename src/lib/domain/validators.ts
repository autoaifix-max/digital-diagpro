import { z } from "zod";

const optionalEmailSchema = z
  .string()
  .trim()
  .max(160)
  .refine((value) => value === "" || z.email().safeParse(value).success, "البريد الإلكتروني غير صحيح");

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const saudiPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .transform((value) => {
    if (value.startsWith("966")) return `+${value}`;
    if (value.startsWith("05")) return `+966${value.slice(1)}`;
    if (value.startsWith("5") && value.length === 9) return `+966${value}`;
    return value;
  })
  .refine((value) => /^\+9665\d{8}$/.test(value), "رقم الجوال السعودي غير صحيح");

export const publicBookingSchema = z.object({
  customerName: z.string().trim().min(2, "اكتب اسم العميل").max(120),
  phone: saudiPhoneSchema,
  vehicleMake: z.string().trim().min(2, "اختر أو اكتب الشركة").max(80),
  vehicleModel: z.string().trim().min(1, "اكتب الموديل").max(80),
  vehicleYear: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  plateNumber: z.string().trim().max(30).optional().default(""),
  serviceCode: z.string().trim().min(2).max(60),
  complaint: z.string().trim().min(5, "اشرح المشكلة باختصار").max(1500),
  preferredDate: z.string().date(),
  preferredTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "الوقت غير صحيح"),
  consent: z.literal(true, { message: "يلزم الموافقة على استخدام البيانات لإدارة الحجز" }),
});

export const customerCreateSchema = z.object({
  fullName: z.string().trim().min(2, "اكتب اسم العميل").max(120),
  phone: saudiPhoneSchema,
  email: optionalEmailSchema.default(""),
  notes: optionalText(2000),
});

export const customerPatchSchema = customerCreateSchema.extend({
  isActive: z.boolean(),
});

export const vehicleCreateSchema = z.object({
  customerId: z.string().uuid(),
  make: z.string().trim().min(2, "اكتب الشركة").max(80),
  model: z.string().trim().min(1, "اكتب الموديل").max(80),
  modelYear: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  vin: z.string().trim().max(17).refine((value) => value === "" || value.length >= 11, "رقم الهيكل يجب أن يكون بين 11 و17 خانة").default(""),
  plateNumber: optionalText(30),
  engine: optionalText(80),
  color: optionalText(50),
  mileage: z.union([z.literal(""), z.coerce.number().int().min(0).max(5_000_000)]).optional().default(""),
  notes: optionalText(2000),
});

export const vehiclePatchSchema = vehicleCreateSchema.extend({
  isActive: z.boolean(),
});

export const serviceCreateSchema = z.object({
  code: z.string().trim().min(2, "اكتب رمز الخدمة").max(60).regex(/^[a-z0-9_-]+$/, "استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطة فقط"),
  nameAr: z.string().trim().min(2, "اكتب اسم الخدمة").max(120),
  descriptionAr: optionalText(1000),
  basePrice: z.union([z.literal(""), z.coerce.number().min(0).max(1_000_000)]).optional().default(""),
  estimatedMinutes: z.union([z.literal(""), z.coerce.number().int().min(5).max(10080)]).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const servicePatchSchema = serviceCreateSchema.extend({
  isActive: z.boolean(),
});

export const approvalRequestSchema = z.object({
  workOrderId: z.string().uuid(),
  requestedAmount: z.coerce.number().min(0).max(1_000_000),
  itemsSummary: z.string().trim().min(3, "اكتب ملخص الأعمال أو عرض السعر").max(5000),
  channel: z.enum(["in_person", "phone", "whatsapp", "portal", "other"]).default("whatsapp"),
  customerVisible: z.boolean().default(true),
});

export const approvalDecisionSchema = z.object({
  status: z.enum(["approved", "rejected", "cancelled"]),
  channel: z.enum(["in_person", "phone", "whatsapp", "portal", "other"]),
  responseNote: optionalText(2000),
});

export const customerApprovalDecisionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  responseNote: optionalText(1000),
});

export const qualityChecklistItemSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(2).max(300),
  result: z.enum(["pending", "pass", "fail", "not_applicable"]),
  note: z.string().trim().max(500).default(""),
});

export const qualityCheckSchema = z.object({
  workOrderId: z.string().uuid(),
  status: z.enum(["draft", "passed", "failed"]),
  checklist: z.array(qualityChecklistItemSchema).min(1).max(25),
  notes: optionalText(2000),
});

export const bookingStatusPatchSchema = z.object({
  status: z.enum([
    "new",
    "confirmed",
    "arrived",
    "in_diagnosis",
    "waiting_approval",
    "approved",
    "in_service",
    "completed",
    "cancelled",
    "no_show",
  ]),
  note: z.string().trim().max(500).optional(),
});

export const workOrderStatusPatchSchema = z.object({
  status: z.enum([
    "open",
    "diagnosing",
    "waiting_approval",
    "approved",
    "in_progress",
    "quality_check",
    "ready",
    "delivered",
    "cancelled",
  ]),
  note: z.string().trim().max(500).optional(),
});

export const diagnosticCreateSchema = z.object({
  workOrderId: z.string().uuid(),
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  complaint: z.string().trim().min(3).max(2000),
  dtcs: z.array(z.object({ code: z.string().trim().min(4).max(12), description: z.string().trim().max(300) })).max(50),
  findings: z.string().trim().max(5000).default(""),
  recommendations: z.string().trim().max(5000).default(""),
  status: z.enum(["draft", "in_progress", "completed"]).default("draft"),
});

export const diagnosticPatchSchema = z.object({
  title: z.string().trim().min(3).max(160),
  complaint: z.string().trim().min(3).max(2000),
  dtcs: z.array(z.object({ code: z.string().trim().min(4).max(12), description: z.string().trim().max(300) })).max(50),
  findings: z.string().trim().max(5000).default(""),
  recommendations: z.string().trim().max(5000).default(""),
  technicianConclusion: z.string().trim().max(5000).default(""),
  customerSummary: z.string().trim().max(5000).default(""),
  status: z.enum(["draft", "in_progress", "completed"]),
  customerVisible: z.boolean().default(false),
});


export const walkInIntakeSchema = z.object({
  customerName: z.string().trim().min(2, "اكتب اسم العميل").max(120),
  phone: saudiPhoneSchema,
  email: optionalEmailSchema.default(""),
  vehicleMake: z.string().trim().min(2, "اكتب الشركة").max(80),
  vehicleModel: z.string().trim().min(1, "اكتب الموديل").max(80),
  vehicleYear: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  vin: z.string().trim().max(17).refine((value) => value === "" || value.length >= 11, "رقم الهيكل يجب أن يكون بين 11 و17 خانة").default(""),
  plateNumber: optionalText(30),
  serviceCode: z.string().trim().min(2).max(60),
  complaint: z.string().trim().min(5, "اكتب شكوى العميل بوضوح").max(2000),
  priority: z.enum(["normal", "urgent"]).default("normal"),
  odometerIn: z.union([z.literal(""), z.coerce.number().int().min(0).max(5_000_000)]).optional().default(""),
  fuelLevelPercent: z.union([z.literal(""), z.coerce.number().int().min(0).max(100)]).optional().default(""),
  promisedAt: z.string().trim().optional().default(""),
});

export const workOrderDetailsSchema = z.object({
  priority: z.enum(["normal", "urgent"]),
  assignedTo: z.string().uuid().nullable().optional(),
  odometerIn: z.union([z.literal(""), z.coerce.number().int().min(0).max(5_000_000)]).optional().default(""),
  fuelLevelPercent: z.union([z.literal(""), z.coerce.number().int().min(0).max(100)]).optional().default(""),
  promisedAt: z.string().trim().optional().default(""),
  laborTotal: z.coerce.number().min(0).max(10_000_000).default(0),
  partsTotal: z.coerce.number().min(0).max(10_000_000).default(0),
  discountTotal: z.coerce.number().min(0).max(10_000_000).default(0),
  taxTotal: z.coerce.number().min(0).max(10_000_000).default(0),
  approvalNote: optionalText(5000),
  internalNotes: optionalText(5000),
});

export const staffCreateSchema = z.object({
  fullName: z.string().trim().min(2, "اكتب اسم الموظف").max(120),
  email: z.email("البريد الإلكتروني غير صحيح").max(160),
  role: z.enum(["admin", "receptionist", "technician"]),
});

export const staffPatchSchema = z.object({
  fullName: z.string().trim().min(2, "اكتب اسم الموظف").max(120),
  role: z.enum(["admin", "receptionist", "technician"]),
  isActive: z.boolean(),
});
