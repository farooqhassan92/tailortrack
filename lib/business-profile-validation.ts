import { z } from "zod";

const optionalTrimmedText = (maxLength: number, status: string) =>
  z
    .string()
    .trim()
    .max(maxLength, status)
    .transform((value) => value || null);

const businessProfileSchema = z.object({
  address: optionalTrimmedText(180, "address-too-long"),
  city: optionalTrimmedText(60, "city-too-long"),
  invoiceFooter: optionalTrimmedText(160, "footer-too-long"),
  name: z
    .string()
    .trim()
    .min(2, "invalid-name")
    .max(80, "name-too-long"),
  phone: z
    .string()
    .trim()
    .max(24, "invalid-phone")
    .transform((value) => value || null)
    .refine((value) => !value || /^[+()\-\s0-9]{7,24}$/.test(value), "invalid-phone")
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function parseBusinessProfileForm(formData: FormData):
  | {
      data: BusinessProfileInput;
      success: true;
    }
  | {
      status: string;
      success: false;
    } {
  const result = businessProfileSchema.safeParse({
    address: readString(formData, "address"),
    city: readString(formData, "city"),
    invoiceFooter: readString(formData, "invoiceFooter"),
    name: readString(formData, "name"),
    phone: readString(formData, "phone")
  });

  if (!result.success) {
    return {
      status: result.error.issues[0]?.message || "invalid",
      success: false
    };
  }

  return {
    data: result.data,
    success: true
  };
}
