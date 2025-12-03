import { z } from 'zod';

/**
 * Validation schema for creating a package via external company API
 */
export const createPackageSchema = z.object({
  to_name: z.string()
    .min(2, 'The to_name field must be at least 2 characters.')
    .max(200, 'The to_name field cannot exceed 200 characters.')
    .trim(),
  
  to_phone: z.string()
    .min(1, 'The to_phone field is required.')
    .min(7, 'The to_phone field must be at least 7 characters.')
    .max(20, 'The to_phone field cannot exceed 20 characters.')
    .regex(/^[\+]?[0-9\s\-\(\)]{7,20}$/, 'The to_phone field format is invalid.')
    .trim(),
  
  alter_phone: z.string()
    .min(1, 'The alter_phone field is required.')
    .min(7, 'The alter_phone field must be at least 7 characters.')
    .max(20, 'The alter_phone field cannot exceed 20 characters.')
    .regex(/^[\+]?[0-9\s\-\(\)]{7,20}$/, 'The alter_phone field format is invalid.')
    .trim(),
  
  description: z.string()
    .min(1, 'The description field is required.')
    .min(3, 'The description field must be at least 3 characters.')
    .max(1000, 'The description field cannot exceed 1000 characters.')
    .trim(),
  
  package_type: z.string()
    .min(1, 'The package_type field is required.')
    .max(50, 'The package_type field cannot exceed 50 characters.')
    .trim(),
  
  village_id: z.union([
    z.string()
      .min(1, 'The village_id field is required.')
      .transform((val) => {
        const num = parseInt(val, 10);
        if (isNaN(num) || num <= 0) {
          throw new Error('The village_id field must be a positive integer.');
        }
        return num;
      }),
    z.number()
      .int('The village_id field must be an integer.')
      .positive('The village_id field must be a positive number.')
  ]).refine(
    (val) => {
      // Validate that village_id is within expected range (1-741 based on villages.json)
      // This is a soft validation - actual validation happens in the API route by checking database
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      return num >= 1 && num <= 741;
    },
    { message: 'The village_id field must be between 1 and 741. Please check the villages data document for valid village IDs.' }
  ),
  
  street: z.string()
    .min(1, 'The street field is required.')
    .min(5, 'The street field must be at least 5 characters.')
    .max(500, 'The street field cannot exceed 500 characters.')
    .trim(),
  
  total_cost: z.union([
    z.string()
      .min(1, 'The total_cost field is required.')
      .transform((val) => {
        const num = parseFloat(val);
        if (isNaN(num)) {
          throw new Error('The total_cost field must be a valid number.');
        }
        if (num < 0) {
          throw new Error('The total_cost field must be greater than or equal to 0.');
        }
        return num;
      }),
    z.number()
      .min(0, 'The total_cost field must be greater than or equal to 0.')
  ]),
  
  note: z.string()
    .max(1000, 'The note field cannot exceed 1000 characters.')
    .trim()
    .optional(),
  
  barcode: z.string()
    .min(1, 'The barcode field is required.')
    .max(100, 'The barcode field cannot exceed 100 characters.')
    .trim()
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;

