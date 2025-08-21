import { db } from '../db';
import { couriersTable, transactionsTable } from '../db/schema';
import { type Courier, type CreateCourierInput, type UpdateCourierInput, type PaginationInput } from '../schema';
import { eq, or, ilike, count, desc, SQL } from 'drizzle-orm';

export async function createCourier(input: CreateCourierInput): Promise<Courier> {
  try {
    const result = await db.insert(couriersTable)
      .values({
        name: input.name,
        code: input.code,
        notes: input.notes
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Courier creation failed:', error);
    throw error;
  }
}

export async function getCouriers(pagination: PaginationInput): Promise<{ couriers: Courier[], total: number }> {
  try {
    const offset = pagination.limit !== -1 ? (pagination.page - 1) * pagination.limit : 0;

    // Handle queries with or without search
    if (pagination.search) {
      const searchTerm = `%${pagination.search}%`;
      const searchCondition = or(
        ilike(couriersTable.name, searchTerm),
        ilike(couriersTable.code, searchTerm)
      )!;

      // Query with search
      const couriersPromise = pagination.limit !== -1
        ? db.select()
            .from(couriersTable)
            .where(searchCondition)
            .orderBy(desc(couriersTable.created_at))
            .limit(pagination.limit)
            .offset(offset)
            .execute()
        : db.select()
            .from(couriersTable)
            .where(searchCondition)
            .orderBy(desc(couriersTable.created_at))
            .execute();

      const countPromise = db.select({ count: count() })
        .from(couriersTable)
        .where(searchCondition)
        .execute();

      const [couriers, totalResult] = await Promise.all([couriersPromise, countPromise]);

      return {
        couriers,
        total: totalResult[0].count
      };
    } else {
      // Query without search
      const couriersPromise = pagination.limit !== -1
        ? db.select()
            .from(couriersTable)
            .orderBy(desc(couriersTable.created_at))
            .limit(pagination.limit)
            .offset(offset)
            .execute()
        : db.select()
            .from(couriersTable)
            .orderBy(desc(couriersTable.created_at))
            .execute();

      const countPromise = db.select({ count: count() })
        .from(couriersTable)
        .execute();

      const [couriers, totalResult] = await Promise.all([couriersPromise, countPromise]);

      return {
        couriers,
        total: totalResult[0].count
      };
    }
  } catch (error) {
    console.error('Get couriers failed:', error);
    throw error;
  }
}

export async function getAllCouriers(): Promise<Courier[]> {
  try {
    const couriers = await db.select()
      .from(couriersTable)
      .orderBy(couriersTable.name)
      .execute();

    return couriers;
  } catch (error) {
    console.error('Get all couriers failed:', error);
    throw error;
  }
}

export async function getCourierById(id: number): Promise<Courier | null> {
  try {
    const result = await db.select()
      .from(couriersTable)
      .where(eq(couriersTable.id, id))
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Get courier by ID failed:', error);
    throw error;
  }
}

export async function updateCourier(input: UpdateCourierInput): Promise<Courier> {
  try {
    // Check if courier exists
    const existingCourier = await getCourierById(input.id);
    if (!existingCourier) {
      throw new Error('Courier not found');
    }

    // Build update data with only provided fields
    const updateData: Partial<typeof input> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.code !== undefined) updateData.code = input.code;
    if (input.notes !== undefined) updateData.notes = input.notes;

    // Add updated_at timestamp
    const updateWithTimestamp = {
      ...updateData,
      updated_at: new Date()
    };

    const result = await db.update(couriersTable)
      .set(updateWithTimestamp)
      .where(eq(couriersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Courier update failed:', error);
    throw error;
  }
}

export async function deleteCourier(id: number): Promise<void> {
  try {
    // Check if courier exists
    const existingCourier = await getCourierById(id);
    if (!existingCourier) {
      throw new Error('Courier not found');
    }

    // Check if courier has associated transactions
    const transactionCount = await db.select({ count: count() })
      .from(transactionsTable)
      .where(eq(transactionsTable.courier_id, id))
      .execute();

    if (transactionCount[0].count > 0) {
      throw new Error('Cannot delete courier with associated transactions');
    }

    // Delete the courier
    await db.delete(couriersTable)
      .where(eq(couriersTable.id, id))
      .execute();
  } catch (error) {
    console.error('Courier deletion failed:', error);
    throw error;
  }
}