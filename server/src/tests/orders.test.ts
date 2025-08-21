import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, couriersTable, transactionsTable, shopSettingsTable } from '../db/schema';
import { type CreateCustomerInput, type CreateCourierInput, type CreateTransactionInput, type PaginationInput } from '../schema';
import { eq } from 'drizzle-orm';
import {
  getOrdersByStatus,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStatusCounts,
  deleteOrder,
  generateOrderReceipt
} from '../handlers/orders';

// Test data
const testCustomer: CreateCustomerInput = {
  name: 'John Doe',
  phone: '081234567890',
  address: 'Jl. Merdeka No. 123',
  city: 'Jakarta',
  province: 'DKI Jakarta',
  notes: 'Regular customer'
};

const testCourier: CreateCourierInput = {
  name: 'JNE Express',
  code: 'JNE',
  notes: 'Fast delivery'
};

const testShopSettings = {
  shop_name: 'Jersey Store',
  shop_address: 'Jl. Olahraga No. 456',
  shop_phone: '021-12345678',
  receipt_template: 'default'
};

const testPagination: PaginationInput = {
  page: 1,
  limit: 20,
  search: undefined
};

describe('Orders Handler', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let customerId: number;
  let courierId: number;
  let transactionId: number;

  beforeEach(async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create test courier
    const courierResult = await db.insert(couriersTable)
      .values(testCourier)
      .returning()
      .execute();
    courierId = courierResult[0].id;

    // Create shop settings
    await db.insert(shopSettingsTable)
      .values(testShopSettings)
      .execute();

    // Create test transaction
    const testTransaction: CreateTransactionInput = {
      customer_id: customerId,
      jersey_name: 'Real Madrid Home 2024',
      jersey_size: 'L',
      price: 150000,
      quantity: 1,
      total_payment: 150000,
      payment_method: 'Cash',
      courier_id: courierId,
      transaction_date: new Date(),
      notes: 'Test order'
    };

    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        price: testTransaction.price.toString(),
        total_payment: testTransaction.total_payment.toString()
      })
      .returning()
      .execute();
    transactionId = transactionResult[0].id;
  });

  describe('getOrdersByStatus', () => {
    it('should fetch orders by status with customer and courier relations', async () => {
      const result = await getOrdersByStatus('pending', testPagination);

      expect(result.orders).toHaveLength(1);
      expect(result.total).toBe(1);

      const order = result.orders[0];
      expect(order.id).toBe(transactionId);
      expect(order.customer.name).toBe(testCustomer.name);
      expect(order.courier?.name).toBe(testCourier.name);
      expect(order.jersey_name).toBe('Real Madrid Home 2024');
      expect(order.order_status).toBe('pending');
      expect(typeof order.price).toBe('number');
      expect(typeof order.total_payment).toBe('number');
      expect(order.price).toBe(150000);
    });

    it('should support search by customer name', async () => {
      const searchPagination: PaginationInput = {
        ...testPagination,
        search: 'John'
      };

      const result = await getOrdersByStatus('pending', searchPagination);

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].customer.name).toBe('John Doe');
    });

    it('should support search by jersey name', async () => {
      const searchPagination: PaginationInput = {
        ...testPagination,
        search: 'Real Madrid'
      };

      const result = await getOrdersByStatus('pending', searchPagination);

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].jersey_name).toBe('Real Madrid Home 2024');
    });

    it('should support search by order ID', async () => {
      const searchPagination: PaginationInput = {
        ...testPagination,
        search: transactionId.toString()
      };

      const result = await getOrdersByStatus('pending', searchPagination);

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].id).toBe(transactionId);
    });

    it('should return empty results for non-matching status', async () => {
      const result = await getOrdersByStatus('completed', testPagination);

      expect(result.orders).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      // Create additional transactions
      for (let i = 0; i < 25; i++) {
        await db.insert(transactionsTable)
          .values({
            customer_id: customerId,
            jersey_name: `Jersey ${i}`,
            jersey_size: 'M',
            price: '100000',
            quantity: 1,
            total_payment: '100000',
            payment_method: 'Cash',
            courier_id: courierId,
            transaction_date: new Date(),
            notes: null
          })
          .execute();
      }

      const paginationInput: PaginationInput = {
        page: 2,
        limit: 10,
        search: undefined
      };

      const result = await getOrdersByStatus('pending', paginationInput);

      expect(result.orders).toHaveLength(10);
      expect(result.total).toBe(26); // 1 original + 25 new
    });

    it('should return all orders when limit is -1', async () => {
      // Create additional transactions
      for (let i = 0; i < 5; i++) {
        await db.insert(transactionsTable)
          .values({
            customer_id: customerId,
            jersey_name: `Jersey ${i}`,
            jersey_size: 'M',
            price: '100000',
            quantity: 1,
            total_payment: '100000',
            payment_method: 'Cash',
            courier_id: courierId,
            transaction_date: new Date(),
            notes: null
          })
          .execute();
      }

      const paginationInput: PaginationInput = {
        page: 1,
        limit: -1,
        search: undefined
      };

      const result = await getOrdersByStatus('pending', paginationInput);

      expect(result.orders).toHaveLength(6); // 1 original + 5 new
      expect(result.total).toBe(6);
    });
  });

  describe('getAllOrders', () => {
    it('should fetch all orders with relations', async () => {
      const result = await getAllOrders(testPagination);

      expect(result.orders).toHaveLength(1);
      expect(result.total).toBe(1);

      const order = result.orders[0];
      expect(order.id).toBe(transactionId);
      expect(order.customer.name).toBe(testCustomer.name);
      expect(order.courier?.name).toBe(testCourier.name);
      expect(typeof order.price).toBe('number');
      expect(order.price).toBe(150000);
    });

    it('should support search functionality', async () => {
      const searchPagination: PaginationInput = {
        ...testPagination,
        search: 'Madrid'
      };

      const result = await getAllOrders(searchPagination);

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].jersey_name).toBe('Real Madrid Home 2024');
    });

    it('should handle orders with null courier', async () => {
      // Create transaction without courier
      const transactionWithoutCourier = await db.insert(transactionsTable)
        .values({
          customer_id: customerId,
          jersey_name: 'Barcelona Away 2024',
          jersey_size: 'S',
          price: '120000',
          quantity: 1,
          total_payment: '120000',
          payment_method: 'Transfer',
          courier_id: null,
          transaction_date: new Date(),
          notes: 'No shipping required'
        })
        .returning()
        .execute();

      const result = await getAllOrders(testPagination);

      expect(result.orders).toHaveLength(2);
      
      const orderWithoutCourier = result.orders.find(o => o.id === transactionWithoutCourier[0].id);
      expect(orderWithoutCourier?.courier).toBeNull();
    });
  });

  describe('getOrderById', () => {
    it('should fetch order by ID with relations', async () => {
      const order = await getOrderById(transactionId);

      expect(order).not.toBeNull();
      expect(order!.id).toBe(transactionId);
      expect(order!.customer.name).toBe(testCustomer.name);
      expect(order!.courier?.name).toBe(testCourier.name);
      expect(order!.jersey_name).toBe('Real Madrid Home 2024');
      expect(typeof order!.price).toBe('number');
      expect(order!.price).toBe(150000);
    });

    it('should return null for non-existent order', async () => {
      const order = await getOrderById(99999);

      expect(order).toBeNull();
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      const updatedOrder = await updateOrderStatus({
        id: transactionId,
        order_status: 'in_process'
      });

      expect(updatedOrder.id).toBe(transactionId);
      expect(updatedOrder.order_status).toBe('in_process');
      expect(updatedOrder.updated_at).toBeInstanceOf(Date);

      // Verify in database
      const dbOrder = await getOrderById(transactionId);
      expect(dbOrder?.order_status).toBe('in_process');
    });

    it('should throw error for non-existent order', async () => {
      await expect(updateOrderStatus({
        id: 99999,
        order_status: 'completed'
      })).rejects.toThrow(/not found/i);
    });
  });

  describe('getOrderStatusCounts', () => {
    it('should return correct status counts', async () => {
      // Create orders with different statuses
      await db.insert(transactionsTable)
        .values({
          customer_id: customerId,
          jersey_name: 'Test Jersey',
          jersey_size: 'M',
          price: '100000',
          quantity: 1,
          total_payment: '100000',
          payment_method: 'Cash',
          courier_id: courierId,
          order_status: 'completed',
          transaction_date: new Date(),
          notes: null
        })
        .execute();

      await db.insert(transactionsTable)
        .values({
          customer_id: customerId,
          jersey_name: 'Another Jersey',
          jersey_size: 'L',
          price: '150000',
          quantity: 1,
          total_payment: '150000',
          payment_method: 'Transfer',
          courier_id: courierId,
          order_status: 'in_process',
          transaction_date: new Date(),
          notes: null
        })
        .execute();

      const counts = await getOrderStatusCounts();

      expect(counts.total).toBe(3);
      expect(counts.pending).toBe(1);
      expect(counts.completed).toBe(1);
      expect(counts.in_process).toBe(1);
      expect(counts.returned).toBe(0);
    });

    it('should return zero counts when no orders exist', async () => {
      // Delete all transactions
      await db.delete(transactionsTable).execute();

      const counts = await getOrderStatusCounts();

      expect(counts.total).toBe(0);
      expect(counts.pending).toBe(0);
      expect(counts.completed).toBe(0);
      expect(counts.in_process).toBe(0);
      expect(counts.returned).toBe(0);
    });
  });

  describe('deleteOrder', () => {
    it('should delete order successfully', async () => {
      await deleteOrder(transactionId);

      // Verify order is deleted
      const order = await getOrderById(transactionId);
      expect(order).toBeNull();
    });

    it('should throw error for non-existent order', async () => {
      await expect(deleteOrder(99999)).rejects.toThrow(/not found/i);
    });
  });

  describe('generateOrderReceipt', () => {
    it('should generate receipt for order', async () => {
      const receipt = await generateOrderReceipt(transactionId);

      expect(typeof receipt).toBe('string');
      expect(receipt).toContain('Jersey Store');
      expect(receipt).toContain('STRUK PEMBELIAN');
      expect(receipt).toContain(`No. Order: ${transactionId}`);
      expect(receipt).toContain('John Doe');
      expect(receipt).toContain('Real Madrid Home 2024');
      expect(receipt).toContain('Size: L');
      expect(receipt).toContain('Rp 150.000');
      expect(receipt).toContain('JNE Express');
      expect(receipt).toContain('Cash');
      expect(receipt).toContain('Test order');
    });

    it('should handle order without courier', async () => {
      // Create transaction without courier
      const transactionWithoutCourier = await db.insert(transactionsTable)
        .values({
          customer_id: customerId,
          jersey_name: 'Barcelona Away 2024',
          jersey_size: 'S',
          price: '120000',
          quantity: 1,
          total_payment: '120000',
          payment_method: 'Transfer',
          courier_id: null,
          transaction_date: new Date(),
          notes: null
        })
        .returning()
        .execute();

      const receipt = await generateOrderReceipt(transactionWithoutCourier[0].id);

      expect(receipt).toContain('Kurir: -');
      expect(receipt).not.toContain('JNE Express');
    });

    it('should handle order without notes', async () => {
      // Update transaction to remove notes
      await db.update(transactionsTable)
        .set({ notes: null })
        .where(eq(transactionsTable.id, transactionId))
        .execute();

      const receipt = await generateOrderReceipt(transactionId);

      expect(receipt).not.toContain('Catatan:');
    });

    it('should throw error for non-existent order', async () => {
      await expect(generateOrderReceipt(99999)).rejects.toThrow(/not found/i);
    });

    it('should throw error when shop settings not found', async () => {
      // Delete shop settings
      await db.delete(shopSettingsTable).execute();

      await expect(generateOrderReceipt(transactionId)).rejects.toThrow(/shop settings not found/i);
    });
  });
});