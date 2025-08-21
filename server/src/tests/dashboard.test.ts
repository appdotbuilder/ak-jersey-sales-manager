import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, transactionsTable } from '../db/schema';
import { getDashboardStats } from '../handlers/dashboard';

// Test data setup helpers
const createTestCustomer = async (createdAt?: Date) => {
  const result = await db.insert(customersTable)
    .values({
      name: 'Test Customer',
      phone: '123456789',
      address: 'Test Address',
      city: 'Test City',
      province: 'Test Province',
      notes: null,
      created_at: createdAt || new Date(),
      updated_at: new Date()
    })
    .returning()
    .execute();
  
  return result[0];
};

const createTestTransaction = async (customerId: number, options: {
  totalPayment?: number;
  orderStatus?: 'pending' | 'in_process' | 'completed' | 'returned';
  transactionDate?: Date;
} = {}) => {
  const result = await db.insert(transactionsTable)
    .values({
      customer_id: customerId,
      jersey_name: 'Test Jersey',
      jersey_size: 'M',
      price: (options.totalPayment || 100).toString(),
      quantity: 1,
      total_payment: (options.totalPayment || 100).toString(),
      payment_method: 'Cash',
      courier_id: null,
      order_status: options.orderStatus || 'pending',
      transaction_date: options.transactionDate || new Date(),
      notes: null
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats when no data exists', async () => {
    const stats = await getDashboardStats();

    expect(stats.daily_sales).toEqual(0);
    expect(stats.weekly_sales).toEqual(0);
    expect(stats.monthly_sales).toEqual(0);
    expect(stats.new_customers_count).toEqual(0);
    expect(stats.pending_orders).toEqual(0);
    expect(stats.in_process_orders).toEqual(0);
    expect(stats.completed_orders).toEqual(0);
    expect(stats.returned_orders).toEqual(0);
    expect(stats.total_orders).toEqual(0);
  });

  it('should calculate daily sales correctly', async () => {
    const customer = await createTestCustomer();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Create completed transactions for today and yesterday
    await createTestTransaction(customer.id, {
      totalPayment: 150,
      orderStatus: 'completed',
      transactionDate: today
    });

    await createTestTransaction(customer.id, {
      totalPayment: 100,
      orderStatus: 'completed',
      transactionDate: today
    });

    // This should not be included in daily sales (yesterday)
    await createTestTransaction(customer.id, {
      totalPayment: 50,
      orderStatus: 'completed',
      transactionDate: yesterday
    });

    // This should not be included (not completed)
    await createTestTransaction(customer.id, {
      totalPayment: 75,
      orderStatus: 'pending',
      transactionDate: today
    });

    const stats = await getDashboardStats();
    expect(stats.daily_sales).toEqual(250); // 150 + 100
  });

  it('should calculate weekly sales correctly', async () => {
    const customer = await createTestCustomer();
    const today = new Date();
    
    // Calculate start of this week and last week
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - today.getDay());
    
    const lastWeek = new Date(startOfThisWeek);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Create completed transactions for this week
    await createTestTransaction(customer.id, {
      totalPayment: 200,
      orderStatus: 'completed',
      transactionDate: startOfThisWeek
    });

    await createTestTransaction(customer.id, {
      totalPayment: 300,
      orderStatus: 'completed',
      transactionDate: today
    });

    // This should not be included (last week)
    await createTestTransaction(customer.id, {
      totalPayment: 100,
      orderStatus: 'completed',
      transactionDate: lastWeek
    });

    const stats = await getDashboardStats();
    expect(stats.weekly_sales).toEqual(500); // 200 + 300
  });

  it('should calculate monthly sales correctly', async () => {
    const customer = await createTestCustomer();
    const today = new Date();
    
    // Calculate start of this month and last month
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);

    // Create completed transactions for this month
    await createTestTransaction(customer.id, {
      totalPayment: 400,
      orderStatus: 'completed',
      transactionDate: startOfThisMonth
    });

    await createTestTransaction(customer.id, {
      totalPayment: 600,
      orderStatus: 'completed',
      transactionDate: today
    });

    // This should not be included (last month)
    await createTestTransaction(customer.id, {
      totalPayment: 200,
      orderStatus: 'completed',
      transactionDate: lastMonth
    });

    const stats = await getDashboardStats();
    expect(stats.monthly_sales).toEqual(1000); // 400 + 600
  });

  it('should count new customers correctly', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Create customers for today and yesterday
    await createTestCustomer(today);
    await createTestCustomer(today);
    await createTestCustomer(yesterday); // Should not be counted

    const stats = await getDashboardStats();
    expect(stats.new_customers_count).toEqual(2);
  });

  it('should count order statuses correctly', async () => {
    const customer = await createTestCustomer();

    // Create transactions with different statuses
    await createTestTransaction(customer.id, { orderStatus: 'pending' });
    await createTestTransaction(customer.id, { orderStatus: 'pending' });
    await createTestTransaction(customer.id, { orderStatus: 'in_process' });
    await createTestTransaction(customer.id, { orderStatus: 'completed' });
    await createTestTransaction(customer.id, { orderStatus: 'completed' });
    await createTestTransaction(customer.id, { orderStatus: 'completed' });
    await createTestTransaction(customer.id, { orderStatus: 'returned' });

    const stats = await getDashboardStats();
    expect(stats.pending_orders).toEqual(2);
    expect(stats.in_process_orders).toEqual(1);
    expect(stats.completed_orders).toEqual(3);
    expect(stats.returned_orders).toEqual(1);
    expect(stats.total_orders).toEqual(7);
  });

  it('should handle mixed scenarios correctly', async () => {
    const customer = await createTestCustomer();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Create various transactions
    await createTestTransaction(customer.id, {
      totalPayment: 100,
      orderStatus: 'completed',
      transactionDate: today
    });

    await createTestTransaction(customer.id, {
      totalPayment: 150,
      orderStatus: 'pending',
      transactionDate: today
    });

    await createTestTransaction(customer.id, {
      totalPayment: 200,
      orderStatus: 'completed',
      transactionDate: yesterday
    });

    const stats = await getDashboardStats();
    
    // Daily sales should only include completed orders from today
    expect(stats.daily_sales).toEqual(100);
    expect(stats.pending_orders).toEqual(1);
    expect(stats.completed_orders).toEqual(2);
    expect(stats.total_orders).toEqual(3);
  });

  it('should handle numeric conversions properly', async () => {
    const customer = await createTestCustomer();

    await createTestTransaction(customer.id, {
      totalPayment: 99.99,
      orderStatus: 'completed'
    });

    const stats = await getDashboardStats();
    
    expect(typeof stats.daily_sales).toBe('number');
    expect(typeof stats.weekly_sales).toBe('number');
    expect(typeof stats.monthly_sales).toBe('number');
    expect(typeof stats.new_customers_count).toBe('number');
    expect(typeof stats.total_orders).toBe('number');
    
    expect(stats.daily_sales).toEqual(99.99);
  });

  it('should handle edge case with transactions at exact date boundaries', async () => {
    const customer = await createTestCustomer();
    
    // Create transaction at exactly start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    await createTestTransaction(customer.id, {
      totalPayment: 250,
      orderStatus: 'completed',
      transactionDate: startOfToday
    });

    const stats = await getDashboardStats();
    expect(stats.daily_sales).toEqual(250);
  });
});