import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const paymentMethodEnum = pgEnum('payment_method', ['COD', 'Cash', 'Transfer', 'Shopee']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'in_process', 'completed', 'returned']);

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  province: text('province').notNull(),
  notes: text('notes'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Couriers table
export const couriersTable = pgTable('couriers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  notes: text('notes'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').notNull().references(() => customersTable.id),
  jersey_name: text('jersey_name').notNull(),
  jersey_size: text('jersey_size').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  total_payment: numeric('total_payment', { precision: 10, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  courier_id: integer('courier_id').references(() => couriersTable.id), // Nullable for non-shipped orders
  order_status: orderStatusEnum('order_status').notNull().default('pending'),
  transaction_date: timestamp('transaction_date').notNull(),
  notes: text('notes'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Shop settings table
export const shopSettingsTable = pgTable('shop_settings', {
  id: serial('id').primaryKey(),
  shop_name: text('shop_name').notNull(),
  shop_address: text('shop_address').notNull(),
  shop_phone: text('shop_phone').notNull(),
  receipt_template: text('receipt_template').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const customersRelations = relations(customersTable, ({ many }) => ({
  transactions: many(transactionsTable),
}));

export const couriersRelations = relations(couriersTable, ({ many }) => ({
  transactions: many(transactionsTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  customer: one(customersTable, {
    fields: [transactionsTable.customer_id],
    references: [customersTable.id],
  }),
  courier: one(couriersTable, {
    fields: [transactionsTable.courier_id],
    references: [couriersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Customer = typeof customersTable.$inferSelect;
export type NewCustomer = typeof customersTable.$inferInsert;

export type Courier = typeof couriersTable.$inferSelect;
export type NewCourier = typeof couriersTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

export type ShopSettings = typeof shopSettingsTable.$inferSelect;
export type NewShopSettings = typeof shopSettingsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  customers: customersTable,
  couriers: couriersTable,
  transactions: transactionsTable,
  shopSettings: shopSettingsTable
};