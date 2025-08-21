import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createCustomerInputSchema,
  updateCustomerInputSchema,
  createCourierInputSchema,
  updateCourierInputSchema,
  createTransactionInputSchema,
  updateTransactionInputSchema,
  updateShopSettingsInputSchema,
  paginationInputSchema,
  reportFilterSchema,
  orderStatusEnum
} from './schema';

// Import handlers
import { getDashboardStats } from './handlers/dashboard';
import { 
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerStats
} from './handlers/customers';
import {
  createCourier,
  getCouriers,
  getAllCouriers,
  getCourierById,
  updateCourier,
  deleteCourier
} from './handlers/couriers';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  generateTransactionReceipt
} from './handlers/transactions';
import {
  getOrdersByStatus,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStatusCounts,
  deleteOrder,
  generateOrderReceipt
} from './handlers/orders';
import {
  getReportData,
  getReportStats,
  exportReportToExcel,
  exportReportToPdf,
  getSalesReportByPeriod,
  getTopCustomersReport,
  getProductPerformanceReport
} from './handlers/reports';
import {
  getShopSettings,
  updateShopSettings,
  exportCustomersToExcel,
  exportOrdersToExcel,
  getReceiptTemplate,
  updateReceiptTemplate,
  initializeDefaultSettings
} from './handlers/settings';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Dashboard routes
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),

  // Customer routes
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),

  getCustomers: publicProcedure
    .input(paginationInputSchema)
    .query(({ input }) => getCustomers(input)),

  getCustomerById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCustomerById(input.id)),

  updateCustomer: publicProcedure
    .input(updateCustomerInputSchema)
    .mutation(({ input }) => updateCustomer(input)),

  deleteCustomer: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCustomer(input.id)),

  getCustomerStats: publicProcedure
    .query(() => getCustomerStats()),

  // Courier routes
  createCourier: publicProcedure
    .input(createCourierInputSchema)
    .mutation(({ input }) => createCourier(input)),

  getCouriers: publicProcedure
    .input(paginationInputSchema)
    .query(({ input }) => getCouriers(input)),

  getAllCouriers: publicProcedure
    .query(() => getAllCouriers()),

  getCourierById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCourierById(input.id)),

  updateCourier: publicProcedure
    .input(updateCourierInputSchema)
    .mutation(({ input }) => updateCourier(input)),

  deleteCourier: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCourier(input.id)),

  // Transaction routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  getTransactions: publicProcedure
    .input(paginationInputSchema)
    .query(({ input }) => getTransactions(input)),

  getTransactionById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTransactionById(input.id)),

  updateTransaction: publicProcedure
    .input(updateTransactionInputSchema)
    .mutation(({ input }) => updateTransaction(input)),

  deleteTransaction: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteTransaction(input.id)),

  generateTransactionReceipt: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => generateTransactionReceipt(input.id)),

  // Order management routes
  getOrdersByStatus: publicProcedure
    .input(z.object({ status: orderStatusEnum, pagination: paginationInputSchema }))
    .query(({ input }) => getOrdersByStatus(input.status, input.pagination)),

  getAllOrders: publicProcedure
    .input(paginationInputSchema)
    .query(({ input }) => getAllOrders(input)),

  getOrderById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getOrderById(input.id)),

  updateOrderStatus: publicProcedure
    .input(z.object({ id: z.number(), order_status: orderStatusEnum }))
    .mutation(({ input }) => updateOrderStatus(input)),

  getOrderStatusCounts: publicProcedure
    .query(() => getOrderStatusCounts()),

  deleteOrder: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteOrder(input.id)),

  generateOrderReceipt: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => generateOrderReceipt(input.id)),

  // Report routes
  getReportData: publicProcedure
    .input(z.object({ filter: reportFilterSchema, pagination: paginationInputSchema }))
    .query(({ input }) => getReportData(input.filter, input.pagination)),

  getReportStats: publicProcedure
    .input(reportFilterSchema)
    .query(({ input }) => getReportStats(input)),

  exportReportToExcel: publicProcedure
    .input(reportFilterSchema)
    .query(({ input }) => exportReportToExcel(input)),

  exportReportToPdf: publicProcedure
    .input(reportFilterSchema)
    .query(({ input }) => exportReportToPdf(input)),

  getSalesReportByPeriod: publicProcedure
    .input(z.object({ 
      period: z.enum(['daily', 'weekly', 'monthly']),
      startDate: z.coerce.date(),
      endDate: z.coerce.date()
    }))
    .query(({ input }) => getSalesReportByPeriod(input.period, input.startDate, input.endDate)),

  getTopCustomersReport: publicProcedure
    .input(z.object({ limit: z.number().int().positive().default(10) }))
    .query(({ input }) => getTopCustomersReport(input.limit)),

  getProductPerformanceReport: publicProcedure
    .query(() => getProductPerformanceReport()),

  // Settings routes
  getShopSettings: publicProcedure
    .query(() => getShopSettings()),

  updateShopSettings: publicProcedure
    .input(updateShopSettingsInputSchema)
    .mutation(({ input }) => updateShopSettings(input)),

  exportCustomersToExcel: publicProcedure
    .query(() => exportCustomersToExcel()),

  exportOrdersToExcel: publicProcedure
    .query(() => exportOrdersToExcel()),

  getReceiptTemplate: publicProcedure
    .query(() => getReceiptTemplate()),

  updateReceiptTemplate: publicProcedure
    .input(z.object({ template: z.string() }))
    .mutation(({ input }) => updateReceiptTemplate(input.template)),

  initializeDefaultSettings: publicProcedure
    .mutation(() => initializeDefaultSettings()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();