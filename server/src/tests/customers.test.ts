import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, transactionsTable } from '../db/schema';
import { type CreateCustomerInput, type UpdateCustomerInput, type PaginationInput } from '../schema';
import { 
  createCustomer, 
  getCustomers, 
  getCustomerById, 
  updateCustomer, 
  deleteCustomer, 
  getCustomerStats 
} from '../handlers/customers';
import { eq } from 'drizzle-orm';

// Test input data
const testCustomerInput: CreateCustomerInput = {
  name: 'John Doe',
  phone: '081234567890',
  address: 'Jl. Test No. 123',
  city: 'Jakarta',
  province: 'DKI Jakarta',
  notes: 'Test customer'
};

const testCustomerInput2: CreateCustomerInput = {
  name: 'Jane Smith',
  phone: '081987654321',
  address: 'Jl. Sample No. 456',
  city: 'Bandung',
  province: 'Jawa Barat',
  notes: null
};

describe('Customer Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const result = await createCustomer(testCustomerInput);

      expect(result.id).toBeDefined();
      expect(result.name).toEqual(testCustomerInput.name);
      expect(result.phone).toEqual(testCustomerInput.phone);
      expect(result.address).toEqual(testCustomerInput.address);
      expect(result.city).toEqual(testCustomerInput.city);
      expect(result.province).toEqual(testCustomerInput.province);
      expect(result.notes).toEqual(testCustomerInput.notes);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save customer to database', async () => {
      const result = await createCustomer(testCustomerInput);

      const customers = await db.select()
        .from(customersTable)
        .where(eq(customersTable.id, result.id))
        .execute();

      expect(customers).toHaveLength(1);
      expect(customers[0].name).toEqual(testCustomerInput.name);
      expect(customers[0].phone).toEqual(testCustomerInput.phone);
      expect(customers[0].address).toEqual(testCustomerInput.address);
    });

    it('should handle null notes field', async () => {
      const inputWithNullNotes = { ...testCustomerInput, notes: null };
      const result = await createCustomer(inputWithNullNotes);

      expect(result.notes).toBeNull();
    });
  });

  describe('getCustomers', () => {
    it('should return empty result when no customers exist', async () => {
      const pagination: PaginationInput = { page: 1, limit: 10 };
      const result = await getCustomers(pagination);

      expect(result.customers).toEqual([]);
      expect(result.total).toEqual(0);
    });

    it('should return customers with pagination', async () => {
      await createCustomer(testCustomerInput);
      await createCustomer(testCustomerInput2);

      const pagination: PaginationInput = { page: 1, limit: 10 };
      const result = await getCustomers(pagination);

      expect(result.customers).toHaveLength(2);
      expect(result.total).toEqual(2);
      expect(result.customers[0].name).toBeDefined();
      expect(result.customers[1].name).toBeDefined();
    });

    it('should apply pagination correctly', async () => {
      await createCustomer(testCustomerInput);
      await createCustomer(testCustomerInput2);

      const pagination: PaginationInput = { page: 1, limit: 1 };
      const result = await getCustomers(pagination);

      expect(result.customers).toHaveLength(1);
      expect(result.total).toEqual(2);
    });

    it('should return all records when limit is -1', async () => {
      await createCustomer(testCustomerInput);
      await createCustomer(testCustomerInput2);

      const pagination: PaginationInput = { page: 1, limit: -1 };
      const result = await getCustomers(pagination);

      expect(result.customers).toHaveLength(2);
      expect(result.total).toEqual(2);
    });

    it('should search customers by name', async () => {
      await createCustomer(testCustomerInput);
      await createCustomer(testCustomerInput2);

      const pagination: PaginationInput = { page: 1, limit: 10, search: 'John' };
      const result = await getCustomers(pagination);

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].name).toEqual('John Doe');
      expect(result.total).toEqual(1);
    });

    it('should search customers by phone', async () => {
      await createCustomer(testCustomerInput);
      await createCustomer(testCustomerInput2);

      const pagination: PaginationInput = { page: 1, limit: 10, search: '081234' };
      const result = await getCustomers(pagination);

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].phone).toEqual('081234567890');
      expect(result.total).toEqual(1);
    });

    it('should search customers by city', async () => {
      await createCustomer(testCustomerInput);
      await createCustomer(testCustomerInput2);

      const pagination: PaginationInput = { page: 1, limit: 10, search: 'Bandung' };
      const result = await getCustomers(pagination);

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].city).toEqual('Bandung');
      expect(result.total).toEqual(1);
    });

    it('should search customers by province', async () => {
      await createCustomer(testCustomerInput);
      await createCustomer(testCustomerInput2);

      const pagination: PaginationInput = { page: 1, limit: 10, search: 'DKI Jakarta' };
      const result = await getCustomers(pagination);

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].province).toEqual('DKI Jakarta');
      expect(result.total).toEqual(1);
    });

    it('should handle case-insensitive search', async () => {
      await createCustomer(testCustomerInput);

      const pagination: PaginationInput = { page: 1, limit: 10, search: 'john doe' };
      const result = await getCustomers(pagination);

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].name).toEqual('John Doe');
    });
  });

  describe('getCustomerById', () => {
    it('should return customer when found', async () => {
      const created = await createCustomer(testCustomerInput);
      const result = await getCustomerById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual(testCustomerInput.name);
      expect(result!.phone).toEqual(testCustomerInput.phone);
    });

    it('should return null when customer not found', async () => {
      const result = await getCustomerById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateCustomer', () => {
    it('should update customer successfully', async () => {
      const created = await createCustomer(testCustomerInput);

      const updateInput: UpdateCustomerInput = {
        id: created.id,
        name: 'Updated Name',
        phone: '089999999999',
        city: 'Updated City'
      };

      const result = await updateCustomer(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Updated Name');
      expect(result.phone).toEqual('089999999999');
      expect(result.city).toEqual('Updated City');
      // Fields not in update should remain unchanged
      expect(result.address).toEqual(testCustomerInput.address);
      expect(result.province).toEqual(testCustomerInput.province);
    });

    it('should update only provided fields', async () => {
      const created = await createCustomer(testCustomerInput);

      const updateInput: UpdateCustomerInput = {
        id: created.id,
        name: 'Only Name Updated'
      };

      const result = await updateCustomer(updateInput);

      expect(result.name).toEqual('Only Name Updated');
      expect(result.phone).toEqual(testCustomerInput.phone);
      expect(result.address).toEqual(testCustomerInput.address);
      expect(result.city).toEqual(testCustomerInput.city);
      expect(result.province).toEqual(testCustomerInput.province);
    });

    it('should handle notes update to null', async () => {
      const created = await createCustomer(testCustomerInput);

      const updateInput: UpdateCustomerInput = {
        id: created.id,
        notes: null
      };

      const result = await updateCustomer(updateInput);

      expect(result.notes).toBeNull();
    });

    it('should throw error when customer not found', async () => {
      const updateInput: UpdateCustomerInput = {
        id: 999,
        name: 'Non-existent Customer'
      };

      await expect(updateCustomer(updateInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('deleteCustomer', () => {
    it('should delete customer successfully', async () => {
      const created = await createCustomer(testCustomerInput);

      await deleteCustomer(created.id);

      const result = await getCustomerById(created.id);
      expect(result).toBeNull();
    });

    it('should throw error when customer not found', async () => {
      await expect(deleteCustomer(999)).rejects.toThrow(/not found/i);
    });

    it('should prevent deletion when customer has transactions', async () => {
      // First create a customer
      const customer = await createCustomer(testCustomerInput);

      // Then create a transaction for that customer
      await db.insert(transactionsTable).values({
        customer_id: customer.id,
        jersey_name: 'Test Jersey',
        jersey_size: 'L',
        price: '100000',
        quantity: 1,
        total_payment: '100000',
        payment_method: 'Cash',
        courier_id: null,
        order_status: 'pending',
        transaction_date: new Date(),
        notes: null
      }).execute();

      await expect(deleteCustomer(customer.id)).rejects.toThrow(/existing transactions/i);
    });
  });

  describe('getCustomerStats', () => {
    it('should return zero stats when no customers exist', async () => {
      const result = await getCustomerStats();

      expect(result.total).toEqual(0);
      expect(result.newThisMonth).toEqual(0);
    });

    it('should return correct total count', async () => {
      await createCustomer(testCustomerInput);
      await createCustomer(testCustomerInput2);

      const result = await getCustomerStats();

      expect(result.total).toEqual(2);
      expect(result.newThisMonth).toEqual(2); // Both created this month
    });

    it('should count new customers this month correctly', async () => {
      // Create a customer
      await createCustomer(testCustomerInput);

      // Create a customer with last month's date by directly inserting
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      await db.insert(customersTable).values({
        name: 'Old Customer',
        phone: '081000000000',
        address: 'Old Address',
        city: 'Old City',
        province: 'Old Province',
        notes: null,
        created_at: lastMonth,
        updated_at: lastMonth
      }).execute();

      const result = await getCustomerStats();

      expect(result.total).toEqual(2);
      expect(result.newThisMonth).toEqual(1); // Only one created this month
    });
  });
});