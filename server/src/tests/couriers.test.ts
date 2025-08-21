import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { couriersTable, transactionsTable, customersTable } from '../db/schema';
import { type CreateCourierInput, type UpdateCourierInput, type PaginationInput } from '../schema';
import {
  createCourier,
  getCouriers,
  getAllCouriers,
  getCourierById,
  updateCourier,
  deleteCourier
} from '../handlers/couriers';
import { eq } from 'drizzle-orm';

// Test data
const testCourierInput: CreateCourierInput = {
  name: 'JNE Express',
  code: 'JNE',
  notes: 'Nationwide shipping service'
};

const testCourierInput2: CreateCourierInput = {
  name: 'J&T Express',
  code: 'JNT',
  notes: null
};

const testCustomer = {
  name: 'John Doe',
  phone: '081234567890',
  address: '123 Main St',
  city: 'Jakarta',
  province: 'DKI Jakarta',
  notes: null
};

describe('Courier Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createCourier', () => {
    it('should create a courier with all fields', async () => {
      const result = await createCourier(testCourierInput);

      expect(result.name).toEqual('JNE Express');
      expect(result.code).toEqual('JNE');
      expect(result.notes).toEqual('Nationwide shipping service');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a courier with null notes', async () => {
      const result = await createCourier(testCourierInput2);

      expect(result.name).toEqual('J&T Express');
      expect(result.code).toEqual('JNT');
      expect(result.notes).toBeNull();
      expect(result.id).toBeDefined();
    });

    it('should save courier to database', async () => {
      const result = await createCourier(testCourierInput);

      const couriers = await db.select()
        .from(couriersTable)
        .where(eq(couriersTable.id, result.id))
        .execute();

      expect(couriers).toHaveLength(1);
      expect(couriers[0].name).toEqual('JNE Express');
      expect(couriers[0].code).toEqual('JNE');
      expect(couriers[0].notes).toEqual('Nationwide shipping service');
    });
  });

  describe('getCourierById', () => {
    it('should return courier when found', async () => {
      const created = await createCourier(testCourierInput);
      const result = await getCourierById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('JNE Express');
      expect(result!.code).toEqual('JNE');
    });

    it('should return null when courier not found', async () => {
      const result = await getCourierById(999);
      expect(result).toBeNull();
    });
  });

  describe('getCouriers', () => {
    beforeEach(async () => {
      // Create test couriers
      await createCourier(testCourierInput);
      await createCourier(testCourierInput2);
      await createCourier({
        name: 'POS Indonesia',
        code: 'POS',
        notes: 'Government postal service'
      });
    });

    it('should return all couriers with pagination', async () => {
      const pagination: PaginationInput = {
        page: 1,
        limit: 10,
        search: undefined
      };

      const result = await getCouriers(pagination);

      expect(result.total).toEqual(3);
      expect(result.couriers).toHaveLength(3);
      expect(result.couriers[0].created_at).toBeInstanceOf(Date);
    });

    it('should support pagination limits', async () => {
      const pagination: PaginationInput = {
        page: 1,
        limit: 2,
        search: undefined
      };

      const result = await getCouriers(pagination);

      expect(result.total).toEqual(3);
      expect(result.couriers).toHaveLength(2);
    });

    it('should support pagination with page 2', async () => {
      const pagination: PaginationInput = {
        page: 2,
        limit: 2,
        search: undefined
      };

      const result = await getCouriers(pagination);

      expect(result.total).toEqual(3);
      expect(result.couriers).toHaveLength(1);
    });

    it('should return all records when limit is -1', async () => {
      const pagination: PaginationInput = {
        page: 1,
        limit: -1,
        search: undefined
      };

      const result = await getCouriers(pagination);

      expect(result.total).toEqual(3);
      expect(result.couriers).toHaveLength(3);
    });

    it('should search by courier name', async () => {
      const pagination: PaginationInput = {
        page: 1,
        limit: 10,
        search: 'JNE'
      };

      const result = await getCouriers(pagination);

      expect(result.total).toEqual(1);
      expect(result.couriers).toHaveLength(1);
      expect(result.couriers[0].name).toEqual('JNE Express');
    });

    it('should search by courier code', async () => {
      const pagination: PaginationInput = {
        page: 1,
        limit: 10,
        search: 'JNT'
      };

      const result = await getCouriers(pagination);

      expect(result.total).toEqual(1);
      expect(result.couriers).toHaveLength(1);
      expect(result.couriers[0].code).toEqual('JNT');
    });

    it('should search case insensitively', async () => {
      const pagination: PaginationInput = {
        page: 1,
        limit: 10,
        search: 'express'
      };

      const result = await getCouriers(pagination);

      expect(result.total).toEqual(2);
      expect(result.couriers).toHaveLength(2);
    });

    it('should return empty results for non-matching search', async () => {
      const pagination: PaginationInput = {
        page: 1,
        limit: 10,
        search: 'nonexistent'
      };

      const result = await getCouriers(pagination);

      expect(result.total).toEqual(0);
      expect(result.couriers).toHaveLength(0);
    });
  });

  describe('getAllCouriers', () => {
    beforeEach(async () => {
      // Create test couriers in specific order to test sorting
      await createCourier({ name: 'Zebra Courier', code: 'ZC', notes: null });
      await createCourier({ name: 'Alpha Express', code: 'AE', notes: null });
      await createCourier({ name: 'Beta Logistics', code: 'BL', notes: null });
    });

    it('should return all couriers sorted by name', async () => {
      const result = await getAllCouriers();

      expect(result).toHaveLength(3);
      expect(result[0].name).toEqual('Alpha Express');
      expect(result[1].name).toEqual('Beta Logistics');
      expect(result[2].name).toEqual('Zebra Courier');
    });

    it('should return empty array when no couriers exist', async () => {
      // Reset to empty state
      await resetDB();
      await createDB();

      const result = await getAllCouriers();
      expect(result).toHaveLength(0);
    });
  });

  describe('updateCourier', () => {
    let createdCourier: any;

    beforeEach(async () => {
      createdCourier = await createCourier(testCourierInput);
    });

    it('should update all fields', async () => {
      const updateInput: UpdateCourierInput = {
        id: createdCourier.id,
        name: 'Updated JNE Express',
        code: 'JNE_NEW',
        notes: 'Updated shipping service'
      };

      const result = await updateCourier(updateInput);

      expect(result.id).toEqual(createdCourier.id);
      expect(result.name).toEqual('Updated JNE Express');
      expect(result.code).toEqual('JNE_NEW');
      expect(result.notes).toEqual('Updated shipping service');
      expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
    });

    it('should update only provided fields', async () => {
      const updateInput: UpdateCourierInput = {
        id: createdCourier.id,
        name: 'Only Name Updated'
      };

      const result = await updateCourier(updateInput);

      expect(result.name).toEqual('Only Name Updated');
      expect(result.code).toEqual('JNE'); // Should remain unchanged
      expect(result.notes).toEqual('Nationwide shipping service'); // Should remain unchanged
    });

    it('should update notes to null', async () => {
      const updateInput: UpdateCourierInput = {
        id: createdCourier.id,
        notes: null
      };

      const result = await updateCourier(updateInput);

      expect(result.notes).toBeNull();
      expect(result.name).toEqual('JNE Express'); // Should remain unchanged
    });

    it('should save updates to database', async () => {
      const updateInput: UpdateCourierInput = {
        id: createdCourier.id,
        name: 'Database Updated Name'
      };

      await updateCourier(updateInput);

      const fromDb = await db.select()
        .from(couriersTable)
        .where(eq(couriersTable.id, createdCourier.id))
        .execute();

      expect(fromDb[0].name).toEqual('Database Updated Name');
    });

    it('should throw error for non-existent courier', async () => {
      const updateInput: UpdateCourierInput = {
        id: 999,
        name: 'Non-existent Courier'
      };

      await expect(updateCourier(updateInput)).rejects.toThrow(/courier not found/i);
    });
  });

  describe('deleteCourier', () => {
    let createdCourier: any;

    beforeEach(async () => {
      createdCourier = await createCourier(testCourierInput);
    });

    it('should delete courier successfully', async () => {
      await deleteCourier(createdCourier.id);

      const fromDb = await db.select()
        .from(couriersTable)
        .where(eq(couriersTable.id, createdCourier.id))
        .execute();

      expect(fromDb).toHaveLength(0);
    });

    it('should throw error for non-existent courier', async () => {
      await expect(deleteCourier(999)).rejects.toThrow(/courier not found/i);
    });

    it('should prevent deletion when courier has associated transactions', async () => {
      // Create a customer first (required for transaction)
      const customerResult = await db.insert(customersTable)
        .values(testCustomer)
        .returning()
        .execute();

      // Create a transaction with this courier
      await db.insert(transactionsTable)
        .values({
          customer_id: customerResult[0].id,
          jersey_name: 'Test Jersey',
          jersey_size: 'L',
          price: '50.00',
          quantity: 1,
          total_payment: '50.00',
          payment_method: 'Cash',
          courier_id: createdCourier.id,
          order_status: 'pending',
          transaction_date: new Date(),
          notes: null
        })
        .execute();

      await expect(deleteCourier(createdCourier.id)).rejects.toThrow(/cannot delete courier with associated transactions/i);

      // Verify courier still exists
      const fromDb = await db.select()
        .from(couriersTable)
        .where(eq(couriersTable.id, createdCourier.id))
        .execute();

      expect(fromDb).toHaveLength(1);
    });
  });
});