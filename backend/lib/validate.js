import { z } from 'zod';

// Shared primitives
const positiveAmount = z.coerce
  .number()
  .positive('Amount must be a positive number')
  .finite('Amount must be a valid number');

const monthFormat = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Must be in YYYY-MM format');

const dateFormat = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format')
  .refine((d) => !isNaN(Date.parse(d)), 'Must be a valid date');

const transactionType = z.enum(['income', 'expense']);

// Transactions
export const createTransactionSchema = z.object({
  type: transactionType,
  amount: positiveAmount,
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional().default(''),
  date: dateFormat,
  recurring_id: z.string().nullish(),
});

export const updateTransactionSchema = z.object({
  type: transactionType.optional(),
  amount: positiveAmount.optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  date: dateFormat.optional(),
});

export const transactionQuerySchema = z.object({
  category: z.string().optional(),
  type: transactionType.optional(),
  start_date: dateFormat.optional(),
  end_date: dateFormat.optional(),
});

// Budgets
export const budgetSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: positiveAmount,
  month: monthFormat,
});

export const budgetQuerySchema = z.object({
  month: monthFormat.optional(),
});

// Recurring
export const createRecurringSchema = z
  .object({
    type: transactionType,
    amount: positiveAmount,
    category: z.string().min(1, 'Category is required'),
    description: z.string().optional().default(''),
    day_of_month: z.coerce
      .number()
      .int('Must be an integer')
      .min(1, 'Must be between 1 and 31')
      .max(31, 'Must be between 1 and 31'),
    start_month: monthFormat.optional(),
    end_month: monthFormat.nullish(),
  })
  .refine(
    (data) => !data.start_month || !data.end_month || data.start_month <= data.end_month,
    { message: 'end_month cannot be before start_month', path: ['end_month'] }
  );

export const generateRecurringSchema = z.object({
  month: monthFormat,
});

// Stats
export const statsQuerySchema = z.object({
  month: monthFormat.optional(),
  type: transactionType.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// Validation middleware factory
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        field: i.path.join('.') || source,
        message: i.message,
      }));
      return res.status(400).json({
        error: issues[0]?.message || 'Validation failed',
        issues,
      });
    }
    req[source] = result.data;
    next();
  };
}
