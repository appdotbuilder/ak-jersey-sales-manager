import { db } from '../db';
import { customersTable, transactionsTable } from '../db/schema';
import { type Customer, type CreateCustomerInput, type UpdateCustomerInput, type PaginationInput } from '../schema';
import { eq, or, ilike, count, gte, and, SQL } from 'drizzle-orm';

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  try {
    const result = await db.insert(customersTable)
      .values({
        name: input.name,
        phone: input.phone,
        address: input.address,
        city: input.city,
        province: input.province,
        notes: input.notes
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Customer creation failed:', error);
    throw error;
  }
}

export async function getCustomers(pagination: PaginationInput): Promise<{ customers: Customer[], total: number }> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    if (pagination.search) {
      const searchTerm = `%${pagination.search}%`;
      conditions.push(
        or(
          ilike(customersTable.name, searchTerm),
          ilike(customersTable.phone, searchTerm),
          ilike(customersTable.city, searchTerm),
          ilike(customersTable.province, searchTerm)
        )!
      );
    }

    // Execute count query
    const totalResult = conditions.length > 0
      ? await db.select({ count: count() })
          .from(customersTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select({ count: count() })
          .from(customersTable)
          .execute();

    // Execute main query with pagination
    let customers;
    if (conditions.length > 0) {
      // Query with search conditions
      if (pagination.limit !== -1) {
        const offset = (pagination.page - 1) * pagination.limit;
        customers = await db.select()
          .from(customersTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .limit(pagination.limit)
          .offset(offset)
          .execute();
      } else {
        customers = await db.select()
          .from(customersTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute();
      }
    } else {
      // Query without search conditions
      if (pagination.limit !== -1) {
        const offset = (pagination.page - 1) * pagination.limit;
        customers = await db.select()
          .from(customersTable)
          .limit(pagination.limit)
          .offset(offset)
          .execute();
      } else {
        customers = await db.select()
          .from(customersTable)
          .execute();
      }
    }

    return {
      customers,
      total: totalResult[0].count
    };
  } catch (error) {
    console.error('Fetching customers failed:', error);
    throw error;
  }
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  try {
    const result = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Fetching customer by ID failed:', error);
    throw error;
  }
}

export async function updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof customersTable.$inferInsert> = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.province !== undefined) updateData.province = input.province;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const result = await db.update(customersTable)
      .set(updateData)
      .where(eq(customersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Customer with ID ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Customer update failed:', error);
    throw error;
  }
}

export async function deleteCustomer(id: number): Promise<void> {
  try {
    // Check if customer has associated transactions
    const transactionCount = await db.select({ count: count() })
      .from(transactionsTable)
      .where(eq(transactionsTable.customer_id, id))
      .execute();

    if (transactionCount[0].count > 0) {
      throw new Error('Cannot delete customer with existing transactions');
    }

    const result = await db.delete(customersTable)
      .where(eq(customersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Customer with ID ${id} not found`);
    }
  } catch (error) {
    console.error('Customer deletion failed:', error);
    throw error;
  }
}

export async function getCustomerStats(): Promise<{ total: number, newThisMonth: number }> {
  try {
    // Get current month start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalResult, newThisMonthResult] = await Promise.all([
      db.select({ count: count() }).from(customersTable).execute(),
      db.select({ count: count() })
        .from(customersTable)
        .where(gte(customersTable.created_at, monthStart))
        .execute()
    ]);

    return {
      total: totalResult[0].count,
      newThisMonth: newThisMonthResult[0].count
    };
  } catch (error) {
    console.error('Fetching customer stats failed:', error);
    throw error;
  }
}