import { db } from '../db';
import { transactionsTable, customersTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { sql, gte, eq, and } from 'drizzle-orm';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Calculate date ranges for filtering
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay()); // Start of week (Sunday)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate daily sales (today's sales total)
    const dailySalesResult = await db.select({
      total: sql<string>`COALESCE(SUM(${transactionsTable.total_payment}), 0)`
    })
    .from(transactionsTable)
    .where(
      and(
        gte(transactionsTable.transaction_date, startOfDay),
        eq(transactionsTable.order_status, 'completed')
      )
    )
    .execute();

    // Calculate weekly sales (this week's sales total)
    const weeklySalesResult = await db.select({
      total: sql<string>`COALESCE(SUM(${transactionsTable.total_payment}), 0)`
    })
    .from(transactionsTable)
    .where(
      and(
        gte(transactionsTable.transaction_date, startOfWeek),
        eq(transactionsTable.order_status, 'completed')
      )
    )
    .execute();

    // Calculate monthly sales (this month's sales total)
    const monthlySalesResult = await db.select({
      total: sql<string>`COALESCE(SUM(${transactionsTable.total_payment}), 0)`
    })
    .from(transactionsTable)
    .where(
      and(
        gte(transactionsTable.transaction_date, startOfMonth),
        eq(transactionsTable.order_status, 'completed')
      )
    )
    .execute();

    // Count new customers (registered today)
    const newCustomersResult = await db.select({
      count: sql<string>`COUNT(*)`
    })
    .from(customersTable)
    .where(gte(customersTable.created_at, startOfDay))
    .execute();

    // Count orders by status
    const orderStatusCounts = await db.select({
      status: transactionsTable.order_status,
      count: sql<string>`COUNT(*)`
    })
    .from(transactionsTable)
    .groupBy(transactionsTable.order_status)
    .execute();

    // Calculate total orders count
    const totalOrdersResult = await db.select({
      count: sql<string>`COUNT(*)`
    })
    .from(transactionsTable)
    .execute();

    // Initialize status counts
    let pending_orders = 0;
    let in_process_orders = 0;
    let completed_orders = 0;
    let returned_orders = 0;

    // Map the grouped results to individual counts
    orderStatusCounts.forEach(statusCount => {
      const count = parseInt(statusCount.count);
      switch (statusCount.status) {
        case 'pending':
          pending_orders = count;
          break;
        case 'in_process':
          in_process_orders = count;
          break;
        case 'completed':
          completed_orders = count;
          break;
        case 'returned':
          returned_orders = count;
          break;
      }
    });

    return {
      daily_sales: parseFloat(dailySalesResult[0].total),
      weekly_sales: parseFloat(weeklySalesResult[0].total),
      monthly_sales: parseFloat(monthlySalesResult[0].total),
      new_customers_count: parseInt(newCustomersResult[0].count),
      pending_orders,
      in_process_orders,
      completed_orders,
      returned_orders,
      total_orders: parseInt(totalOrdersResult[0].count)
    };
  } catch (error) {
    console.error('Dashboard stats calculation failed:', error);
    throw error;
  }
};