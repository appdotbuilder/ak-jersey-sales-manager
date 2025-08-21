import { z } from 'zod';

// Customer schema
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  province: z.string(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

// Input schema for creating customers
export const createCustomerInputSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  province: z.string().min(1),
  notes: z.string().nullable()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

// Input schema for updating customers
export const updateCustomerInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  notes: z.string().nullable().optional()
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

// Courier schema
export const courierSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Courier = z.infer<typeof courierSchema>;

// Input schema for creating couriers
export const createCourierInputSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  notes: z.string().nullable()
});

export type CreateCourierInput = z.infer<typeof createCourierInputSchema>;

// Input schema for updating couriers
export const updateCourierInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  notes: z.string().nullable().optional()
});

export type UpdateCourierInput = z.infer<typeof updateCourierInputSchema>;

// Payment method enum
export const paymentMethodEnum = z.enum(['COD', 'Cash', 'Transfer', 'Shopee']);
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;

// Order status enum
export const orderStatusEnum = z.enum(['pending', 'in_process', 'completed', 'returned']);
export type OrderStatus = z.infer<typeof orderStatusEnum>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  jersey_name: z.string(),
  jersey_size: z.string(),
  price: z.number(),
  quantity: z.number().int(),
  total_payment: z.number(),
  payment_method: paymentMethodEnum,
  courier_id: z.number().nullable(),
  order_status: orderStatusEnum,
  transaction_date: z.coerce.date(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Input schema for creating transactions
export const createTransactionInputSchema = z.object({
  customer_id: z.number(),
  jersey_name: z.string().min(1),
  jersey_size: z.string().min(1),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  total_payment: z.number().positive(),
  payment_method: paymentMethodEnum,
  courier_id: z.number().nullable(),
  transaction_date: z.coerce.date(),
  notes: z.string().nullable()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Input schema for updating transactions
export const updateTransactionInputSchema = z.object({
  id: z.number(),
  customer_id: z.number().optional(),
  jersey_name: z.string().min(1).optional(),
  jersey_size: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  quantity: z.number().int().positive().optional(),
  total_payment: z.number().positive().optional(),
  payment_method: paymentMethodEnum.optional(),
  courier_id: z.number().nullable().optional(),
  order_status: orderStatusEnum.optional(),
  transaction_date: z.coerce.date().optional(),
  notes: z.string().nullable().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

// Shop settings schema
export const shopSettingsSchema = z.object({
  id: z.number(),
  shop_name: z.string(),
  shop_address: z.string(),
  shop_phone: z.string(),
  receipt_template: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ShopSettings = z.infer<typeof shopSettingsSchema>;

// Input schema for updating shop settings
export const updateShopSettingsInputSchema = z.object({
  shop_name: z.string().min(1).optional(),
  shop_address: z.string().min(1).optional(),
  shop_phone: z.string().min(1).optional(),
  receipt_template: z.string().optional()
});

export type UpdateShopSettingsInput = z.infer<typeof updateShopSettingsInputSchema>;

// Pagination schema
export const paginationInputSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.union([z.number().int().positive(), z.literal(-1)]).default(20), // -1 for all records
  search: z.string().optional()
});

export type PaginationInput = z.infer<typeof paginationInputSchema>;

// Dashboard stats schema
export const dashboardStatsSchema = z.object({
  daily_sales: z.number(),
  weekly_sales: z.number(),
  monthly_sales: z.number(),
  new_customers_count: z.number().int(),
  pending_orders: z.number().int(),
  in_process_orders: z.number().int(),
  completed_orders: z.number().int(),
  returned_orders: z.number().int(),
  total_orders: z.number().int()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Report filter schema
export const reportFilterSchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  customer_id: z.number().optional(),
  courier_id: z.number().optional(),
  jersey_name: z.string().optional(),
  order_status: orderStatusEnum.optional(),
  payment_method: paymentMethodEnum.optional()
});

export type ReportFilter = z.infer<typeof reportFilterSchema>;

// Transaction with relations schema for detailed views
export const transactionWithRelationsSchema = z.object({
  id: z.number(),
  customer: customerSchema,
  courier: courierSchema.nullable(),
  jersey_name: z.string(),
  jersey_size: z.string(),
  price: z.number(),
  quantity: z.number().int(),
  total_payment: z.number(),
  payment_method: paymentMethodEnum,
  order_status: orderStatusEnum,
  transaction_date: z.coerce.date(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type TransactionWithRelations = z.infer<typeof transactionWithRelationsSchema>;