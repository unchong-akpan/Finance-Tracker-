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

// CSV Import
export const importTransactionsSchema = z.object({
  transactions: z
    .array(
      z.object({
        type: transactionType,
        amount: positiveAmount,
        category: z.string().min(1, 'Category is required'),
        description: z.string().optional().default(''),
        date: dateFormat,
      })
    )
    .min(1, 'At least one transaction is required')
    .max(500, 'Maximum 500 transactions per import'),
});

// AI categoriser
const aiTransactionSchema = z.object({
  id: z.string().min(1).optional(),
  type: transactionType,
  amount: z.coerce.number().nonnegative('Amount cannot be negative').finite(),
  description: z.string().max(500).optional().default(''),
  category: z.string().max(100).optional().default('Other'),
  date: z.string().max(20).optional().default(''),
});

export const aiAnalyzeSchema = z.object({
  transactions: z.array(aiTransactionSchema).max(500).optional(),
});

export const aiSuggestSchema = z.object({
  type: transactionType,
  amount: z.coerce.number().nonnegative().finite().optional().default(0),
  description: z.string().max(500).optional().default(''),
});

export const aiApplySchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().min(1, 'Transaction id is required'),
        category: z.string().min(1, 'Category is required').max(100),
      })
    )
    .min(1, 'At least one update is required')
    .max(500, 'Maximum 500 updates at once'),
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
