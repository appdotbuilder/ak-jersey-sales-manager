import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, couriersTable, transactionsTable, shopSettingsTable } from '../db/schema';
import { type CreateTransactionInput, type UpdateTransactionInput, type PaginationInput } from '../schema';
import { 
  createTransaction, 
  getTransactions, 
  getTransactionById, 
  updateTransaction, 
  deleteTransaction,
  generateTransactionReceipt
} from '../handlers/transactions';
import { eq } from 'drizzle-orm';

describe('transactions handler', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helpers
  const setupTestCustomer = async () => {
    const result = await db.insert(customersTable)
      .values({
        name: 'John Doe',
        phone: '081234567890',
        address: 'Jl. Merdeka No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        notes: 'Regular customer'
      })
      .returning()
      .execute();
    return result[0];
  };

  const setupTestCourier = async () => {
    const result = await db.insert(couriersTable)
      .values({
        name: 'JNE Express',
        code: 'JNE',
        notes: 'Fast delivery'
      })
      .returning()
      .execute();
    return result[0];
  };

  const setupShopSettings = async () => {
    const result = await db.insert(shopSettingsTable)
      .values({
        shop_name: 'Test Jersey Shop',
        shop_address: 'Jl. Test No. 1',
        shop_phone: '081234567890',
        receipt_template: 'Kunjungi kami lagi!'
      })
      .returning()
      .execute();
    return result[0];
  };

  describe('createTransaction', () => {
    it('should create a transaction successfully', async () => {
      const customer = await setupTestCustomer();
      const courier = await setupTestCourier();

      const input: CreateTransactionInput = {
        customer_id: customer.id,
        jersey_name: 'Barcelona Home 2024',
        jersey_size: 'L',
        price: 150000,
        quantity: 2,
        total_payment: 300000,
        payment_method: 'Transfer',
        courier_id: courier.id,
        transaction_date: new Date('2024-01-15T10:30:00Z'),
        notes: 'Rush order'
      };

      const result = await createTransaction(input);

      expect(result.id).toBeDefined();
      expect(result.customer_id).toBe(customer.id);
      expect(result.jersey_name).toBe('Barcelona Home 2024');
      expect(result.jersey_size).toBe('L');
      expect(result.price).toBe(150000);
      expect(typeof result.price).toBe('number');
      expect(result.quantity).toBe(2);
      expect(result.total_payment).toBe(300000);
      expect(typeof result.total_payment).toBe('number');
      expect(result.payment_method).toBe('Transfer');
      expect(result.courier_id).toBe(courier.id);
      expect(result.order_status).toBe('pending');
      expect(result.transaction_date).toEqual(new Date('2024-01-15T10:30:00Z'));
      expect(result.notes).toBe('Rush order');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create transaction without courier', async () => {
      const customer = await setupTestCustomer();

      const input: CreateTransactionInput = {
        customer_id: customer.id,
        jersey_name: 'Real Madrid Away 2024',
        jersey_size: 'M',
        price: 125000,
        quantity: 1,
        total_payment: 125000,
        payment_method: 'COD',
        courier_id: null,
        transaction_date: new Date('2024-01-15T10:30:00Z'),
        notes: null
      };

      const result = await createTransaction(input);

      expect(result.courier_id).toBeNull();
      expect(result.notes).toBeNull();
      expect(result.order_status).toBe('pending');
    });

    it('should throw error for non-existent customer', async () => {
      const input: CreateTransactionInput = {
        customer_id: 999,
        jersey_name: 'Test Jersey',
        jersey_size: 'L',
        price: 150000,
        quantity: 1,
        total_payment: 150000,
        payment_method: 'Cash',
        courier_id: null,
        transaction_date: new Date(),
        notes: null
      };

      await expect(createTransaction(input)).rejects.toThrow(/customer.*not found/i);
    });

    it('should throw error for non-existent courier', async () => {
      const customer = await setupTestCustomer();

      const input: CreateTransactionInput = {
        customer_id: customer.id,
        jersey_name: 'Test Jersey',
        jersey_size: 'L',
        price: 150000,
        quantity: 1,
        total_payment: 150000,
        payment_method: 'Transfer',
        courier_id: 999,
        transaction_date: new Date(),
        notes: null
      };

      await expect(createTransaction(input)).rejects.toThrow(/courier.*not found/i);
    });
  });

  describe('getTransactions', () => {
    it('should fetch transactions with pagination', async () => {
      const customer = await setupTestCustomer();
      const courier = await setupTestCourier();

      // Create test transactions
      for (let i = 0; i < 3; i++) {
        await createTransaction({
          customer_id: customer.id,
          jersey_name: `Jersey ${i + 1}`,
          jersey_size: 'L',
          price: 150000,
          quantity: 1,
          total_payment: 150000,
          payment_method: 'Cash',
          courier_id: courier.id,
          transaction_date: new Date(),
          notes: null
        });
      }

      const pagination: PaginationInput = {
        page: 1,
        limit: 2
      };

      const result = await getTransactions(pagination);

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.transactions[0].customer).toBeDefined();
      expect(result.transactions[0].customer.name).toBe('John Doe');
      expect(result.transactions[0].courier).toBeDefined();
      expect(result.transactions[0].courier!.name).toBe('JNE Express');
      expect(typeof result.transactions[0].price).toBe('number');
      expect(typeof result.transactions[0].total_payment).toBe('number');
    });

    it('should search transactions by jersey name', async () => {
      const customer = await setupTestCustomer();

      await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Barcelona Home 2024',
        jersey_size: 'L',
        price: 150000,
        quantity: 1,
        total_payment: 150000,
        payment_method: 'Cash',
        courier_id: null,
        transaction_date: new Date(),
        notes: null
      });

      await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Real Madrid Away 2024',
        jersey_size: 'M',
        price: 125000,
        quantity: 1,
        total_payment: 125000,
        payment_method: 'Transfer',
        courier_id: null,
        transaction_date: new Date(),
        notes: null
      });

      const pagination: PaginationInput = {
        page: 1,
        limit: 10,
        search: 'Barcelona'
      };

      const result = await getTransactions(pagination);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].jersey_name).toBe('Barcelona Home 2024');
      expect(result.total).toBe(1);
    });

    it('should search transactions by customer name', async () => {
      const customer = await setupTestCustomer();

      await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Test Jersey',
        jersey_size: 'L',
        price: 150000,
        quantity: 1,
        total_payment: 150000,
        payment_method: 'Cash',
        courier_id: null,
        transaction_date: new Date(),
        notes: null
      });

      const pagination: PaginationInput = {
        page: 1,
        limit: 10,
        search: 'John'
      };

      const result = await getTransactions(pagination);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].customer.name).toBe('John Doe');
      expect(result.total).toBe(1);
    });

    it('should return all transactions when limit is -1', async () => {
      const customer = await setupTestCustomer();

      // Create 5 test transactions
      for (let i = 0; i < 5; i++) {
        await createTransaction({
          customer_id: customer.id,
          jersey_name: `Jersey ${i + 1}`,
          jersey_size: 'L',
          price: 150000,
          quantity: 1,
          total_payment: 150000,
          payment_method: 'Cash',
          courier_id: null,
          transaction_date: new Date(),
          notes: null
        });
      }

      const pagination: PaginationInput = {
        page: 1,
        limit: -1
      };

      const result = await getTransactions(pagination);

      expect(result.transactions).toHaveLength(5);
      expect(result.total).toBe(5);
    });
  });

  describe('getTransactionById', () => {
    it('should fetch transaction by ID with relations', async () => {
      const customer = await setupTestCustomer();
      const courier = await setupTestCourier();

      const transaction = await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Arsenal Home 2024',
        jersey_size: 'XL',
        price: 175000,
        quantity: 1,
        total_payment: 175000,
        payment_method: 'Transfer',
        courier_id: courier.id,
        transaction_date: new Date('2024-01-15T10:30:00Z'),
        notes: 'VIP customer'
      });

      const result = await getTransactionById(transaction.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(transaction.id);
      expect(result!.customer.name).toBe('John Doe');
      expect(result!.courier!.name).toBe('JNE Express');
      expect(result!.jersey_name).toBe('Arsenal Home 2024');
      expect(result!.jersey_size).toBe('XL');
      expect(typeof result!.price).toBe('number');
      expect(result!.price).toBe(175000);
      expect(typeof result!.total_payment).toBe('number');
      expect(result!.total_payment).toBe(175000);
      expect(result!.payment_method).toBe('Transfer');
      expect(result!.order_status).toBe('pending');
      expect(result!.notes).toBe('VIP customer');
    });

    it('should return null for non-existent transaction', async () => {
      const result = await getTransactionById(999);
      expect(result).toBeNull();
    });

    it('should handle transaction without courier', async () => {
      const customer = await setupTestCustomer();

      const transaction = await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Chelsea Home 2024',
        jersey_size: 'S',
        price: 140000,
        quantity: 1,
        total_payment: 140000,
        payment_method: 'COD',
        courier_id: null,
        transaction_date: new Date(),
        notes: null
      });

      const result = await getTransactionById(transaction.id);

      expect(result).toBeDefined();
      expect(result!.courier).toBeNull();
      expect(result!.notes).toBeNull();
    });
  });

  describe('updateTransaction', () => {
    it('should update transaction successfully', async () => {
      const customer = await setupTestCustomer();
      const courier = await setupTestCourier();

      const transaction = await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Liverpool Home 2024',
        jersey_size: 'L',
        price: 160000,
        quantity: 1,
        total_payment: 160000,
        payment_method: 'Cash',
        courier_id: null,
        transaction_date: new Date(),
        notes: null
      });

      const updateInput: UpdateTransactionInput = {
        id: transaction.id,
        jersey_size: 'XL',
        price: 165000,
        total_payment: 165000,
        payment_method: 'Transfer',
        courier_id: courier.id,
        order_status: 'in_process',
        notes: 'Size changed to XL'
      };

      const result = await updateTransaction(updateInput);

      expect(result.id).toBe(transaction.id);
      expect(result.jersey_size).toBe('XL');
      expect(result.price).toBe(165000);
      expect(typeof result.price).toBe('number');
      expect(result.total_payment).toBe(165000);
      expect(typeof result.total_payment).toBe('number');
      expect(result.payment_method).toBe('Transfer');
      expect(result.courier_id).toBe(courier.id);
      expect(result.order_status).toBe('in_process');
      expect(result.notes).toBe('Size changed to XL');
      expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
    });

    it('should update only specified fields', async () => {
      const customer = await setupTestCustomer();

      const transaction = await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Manchester United Home 2024',
        jersey_size: 'M',
        price: 155000,
        quantity: 1,
        total_payment: 155000,
        payment_method: 'Cash',
        courier_id: null,
        transaction_date: new Date(),
        notes: 'Original note'
      });

      const updateInput: UpdateTransactionInput = {
        id: transaction.id,
        order_status: 'completed'
      };

      const result = await updateTransaction(updateInput);

      expect(result.jersey_name).toBe('Manchester United Home 2024'); // Unchanged
      expect(result.jersey_size).toBe('M'); // Unchanged
      expect(result.price).toBe(155000); // Unchanged
      expect(result.notes).toBe('Original note'); // Unchanged
      expect(result.order_status).toBe('completed'); // Changed
    });

    it('should throw error for non-existent transaction', async () => {
      const updateInput: UpdateTransactionInput = {
        id: 999,
        order_status: 'completed'
      };

      await expect(updateTransaction(updateInput)).rejects.toThrow(/transaction.*not found/i);
    });

    it('should throw error for non-existent customer', async () => {
      const customer = await setupTestCustomer();

      const transaction = await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Test Jersey',
        jersey_size: 'L',
        price: 150000,
        quantity: 1,
        total_payment: 150000,
        payment_method: 'Cash',
        courier_id: null,
        transaction_date: new Date(),
        notes: null
      });

      const updateInput: UpdateTransactionInput = {
        id: transaction.id,
        customer_id: 999
      };

      await expect(updateTransaction(updateInput)).rejects.toThrow(/customer.*not found/i);
    });

    it('should throw error for non-existent courier', async () => {
      const customer = await setupTestCustomer();

      const transaction = await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Test Jersey',
        jersey_size: 'L',
        price: 150000,
        quantity: 1,
        total_payment: 150000,
        payment_method: 'Cash',
        courier_id: null,
        transaction_date: new Date(),
        notes: null
      });

      const updateInput: UpdateTransactionInput = {
        id: transaction.id,
        courier_id: 999
      };

      await expect(updateTransaction(updateInput)).rejects.toThrow(/courier.*not found/i);
    });

    it('should allow setting courier_id to null', async () => {
      const customer = await setupTestCustomer();
      const courier = await setupTestCourier();

      const transaction = await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Test Jersey',
        jersey_size: 'L',
        price: 150000,
        quantity: 1,
        total_payment: 150000,
        payment_method: 'Transfer',
        courier_id: courier.id,
        transaction_date: new Date(),
        notes: null
      });

      const updateInput: UpdateTransactionInput = {
        id: transaction.id,
        courier_id: null
      };

      const result = await updateTransaction(updateInput);

      expect(result.courier_id).toBeNull();
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction successfully', async () => {
      const customer = await setupTestCustomer();

      const transaction = await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Test Jersey',
        jersey_size: 'L',
        price: 150000,
        quantity: 1,
        total_payment: 150000,
        payment_method: 'Cash',
        courier_id: null,
        transaction_date: new Date(),
        notes: null
      });

      await deleteTransaction(transaction.id);

      // Verify transaction is deleted
      const deletedTransaction = await db.select()
        .from(transactionsTable)
        .where(eq(transactionsTable.id, transaction.id))
        .execute();

      expect(deletedTransaction).toHaveLength(0);
    });

    it('should throw error for non-existent transaction', async () => {
      await expect(deleteTransaction(999)).rejects.toThrow(/transaction.*not found/i);
    });
  });

  describe('generateTransactionReceipt', () => {
    it('should generate receipt for transaction with courier', async () => {
      const customer = await setupTestCustomer();
      const courier = await setupTestCourier();
      await setupShopSettings();

      const transaction = await createTransaction({
        customer_id: customer.id,
        jersey_name: 'PSG Home 2024',
        jersey_size: 'L',
        price: 180000,
        quantity: 2,
        total_payment: 360000,
        payment_method: 'Transfer',
        courier_id: courier.id,
        transaction_date: new Date('2024-01-15T10:30:00Z'),
        notes: 'Rush delivery'
      });

      const receipt = await generateTransactionReceipt(transaction.id);

      expect(receipt).toContain('Test Jersey Shop');
      expect(receipt).toContain('Jl. Test No. 1');
      expect(receipt).toContain('081234567890');
      expect(receipt).toContain('STRUK PEMBELIAN');
      expect(receipt).toContain('John Doe');
      expect(receipt).toContain('081234567890');
      expect(receipt).toContain('PSG Home 2024');
      expect(receipt).toContain('Size: L');
      expect(receipt).toContain('Qty: 2');
      expect(receipt).toContain('180.000');
      expect(receipt).toContain('360.000');
      expect(receipt).toContain('Transfer');
      expect(receipt).toContain('JNE Express');
      expect(receipt).toContain('JNE');
      expect(receipt).toContain('PENDING');
      expect(receipt).toContain('Rush delivery');
      expect(receipt).toContain('Kunjungi kami lagi!');
    });

    it('should generate receipt for transaction without courier', async () => {
      const customer = await setupTestCustomer();
      await setupShopSettings();

      const transaction = await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Bayern Munich Away 2024',
        jersey_size: 'M',
        price: 170000,
        quantity: 1,
        total_payment: 170000,
        payment_method: 'COD',
        courier_id: null,
        transaction_date: new Date('2024-01-15T15:45:00Z'),
        notes: null
      });

      const receipt = await generateTransactionReceipt(transaction.id);

      expect(receipt).toContain('Bayern Munich Away 2024');
      expect(receipt).toContain('COD');
      expect(receipt).not.toContain('Courier:');
      expect(receipt).not.toContain('Catatan:');
    });

    it('should throw error for non-existent transaction', async () => {
      await expect(generateTransactionReceipt(999)).rejects.toThrow(/transaction.*not found/i);
    });

    it('should throw error when shop settings not configured', async () => {
      const customer = await setupTestCustomer();

      const transaction = await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Test Jersey',
        jersey_size: 'L',
        price: 150000,
        quantity: 1,
        total_payment: 150000,
        payment_method: 'Cash',
        courier_id: null,
        transaction_date: new Date(),
        notes: null
      });

      await expect(generateTransactionReceipt(transaction.id)).rejects.toThrow(/shop settings not configured/i);
    });

    it('should format numbers correctly in receipt', async () => {
      const customer = await setupTestCustomer();
      await setupShopSettings();

      const transaction = await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Test Jersey',
        jersey_size: 'XL',
        price: 1250000, // Large number to test formatting
        quantity: 3,
        total_payment: 3750000,
        payment_method: 'Transfer',
        courier_id: null,
        transaction_date: new Date(),
        notes: null
      });

      const receipt = await generateTransactionReceipt(transaction.id);

      expect(receipt).toContain('1.250.000'); // Indonesian number formatting
      expect(receipt).toContain('3.750.000');
    });

    it('should format dates correctly in receipt', async () => {
      const customer = await setupTestCustomer();
      await setupShopSettings();

      const specificDate = new Date('2024-03-15T14:30:00Z');
      
      const transaction = await createTransaction({
        customer_id: customer.id,
        jersey_name: 'Test Jersey',
        jersey_size: 'L',
        price: 150000,
        quantity: 1,
        total_payment: 150000,
        payment_method: 'Cash',
        courier_id: null,
        transaction_date: specificDate,
        notes: null
      });

      const receipt = await generateTransactionReceipt(transaction.id);

      // Check date formatting (Indonesian locale)
      // Updated regex to match actual output format (14.30 instead of 14:30)
      expect(receipt).toMatch(/Tgl: \d{2}\/\d{2}\/\d{4} \d{2}\.\d{2}/);
    });
  });
});