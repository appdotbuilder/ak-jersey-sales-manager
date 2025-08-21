import { db } from '../db';
import { transactionsTable, customersTable, couriersTable, shopSettingsTable } from '../db/schema';
import { type Transaction, type TransactionWithRelations, type CreateTransactionInput, type UpdateTransactionInput, type PaginationInput } from '../schema';
import { eq, desc, or, ilike, sql, count, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  try {
    // Verify customer exists
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (!customer.length) {
      throw new Error(`Customer with ID ${input.customer_id} not found`);
    }

    // Verify courier exists if provided
    if (input.courier_id) {
      const courier = await db.select()
        .from(couriersTable)
        .where(eq(couriersTable.id, input.courier_id))
        .execute();

      if (!courier.length) {
        throw new Error(`Courier with ID ${input.courier_id} not found`);
      }
    }

    // Insert transaction record
    const result = await db.insert(transactionsTable)
      .values({
        customer_id: input.customer_id,
        jersey_name: input.jersey_name,
        jersey_size: input.jersey_size,
        price: input.price.toString(),
        quantity: input.quantity,
        total_payment: input.total_payment.toString(),
        payment_method: input.payment_method,
        courier_id: input.courier_id,
        order_status: 'pending', // Default status
        transaction_date: input.transaction_date,
        notes: input.notes
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const transaction = result[0];
    return {
      ...transaction,
      price: parseFloat(transaction.price),
      total_payment: parseFloat(transaction.total_payment)
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
}

export async function getTransactions(pagination: PaginationInput): Promise<{ transactions: TransactionWithRelations[], total: number }> {
  try {
    // Build search conditions
    const conditions: SQL<unknown>[] = [];
    if (pagination.search) {
      const searchTerm = `%${pagination.search}%`;
      conditions.push(
        or(
          ilike(transactionsTable.jersey_name, searchTerm),
          ilike(customersTable.name, searchTerm),
          sql`${transactionsTable.id}::text ilike ${searchTerm}`
        )!
      );
    }

    // Build the main query
    let query = db.select({
      transaction: transactionsTable,
      customer: customersTable,
      courier: couriersTable
    })
    .from(transactionsTable)
    .leftJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
    .leftJoin(couriersTable, eq(transactionsTable.courier_id, couriersTable.id))
    .$dynamic();

    // Apply search conditions if any
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply ordering and pagination in one chain
    query = query.orderBy(desc(transactionsTable.created_at));
    
    if (pagination.limit !== -1) {
      const offset = (pagination.page - 1) * pagination.limit;
      query = query.limit(pagination.limit).offset(offset);
    }

    const results = await query;

    // Build count query separately
    let countQuery = db.select({ count: count() })
      .from(transactionsTable)
      .leftJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
      .$dynamic();

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const totalResult = await countQuery;
    const total = totalResult[0].count;

    // Transform results to match expected structure
    const transactions: TransactionWithRelations[] = results.map(result => ({
      id: result.transaction.id,
      customer: result.customer!,
      courier: result.courier,
      jersey_name: result.transaction.jersey_name,
      jersey_size: result.transaction.jersey_size,
      price: parseFloat(result.transaction.price),
      quantity: result.transaction.quantity,
      total_payment: parseFloat(result.transaction.total_payment),
      payment_method: result.transaction.payment_method,
      order_status: result.transaction.order_status,
      transaction_date: result.transaction.transaction_date,
      notes: result.transaction.notes,
      created_at: result.transaction.created_at,
      updated_at: result.transaction.updated_at
    }));

    return {
      transactions,
      total
    };
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw error;
  }
}

export async function getTransactionById(id: number): Promise<TransactionWithRelations | null> {
  try {
    const results = await db.select({
      transaction: transactionsTable,
      customer: customersTable,
      courier: couriersTable
    })
    .from(transactionsTable)
    .leftJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
    .leftJoin(couriersTable, eq(transactionsTable.courier_id, couriersTable.id))
    .where(eq(transactionsTable.id, id))
    .execute();

    if (!results.length) {
      return null;
    }

    const result = results[0];
    return {
      id: result.transaction.id,
      customer: result.customer!,
      courier: result.courier,
      jersey_name: result.transaction.jersey_name,
      jersey_size: result.transaction.jersey_size,
      price: parseFloat(result.transaction.price),
      quantity: result.transaction.quantity,
      total_payment: parseFloat(result.transaction.total_payment),
      payment_method: result.transaction.payment_method,
      order_status: result.transaction.order_status,
      transaction_date: result.transaction.transaction_date,
      notes: result.transaction.notes,
      created_at: result.transaction.created_at,
      updated_at: result.transaction.updated_at
    };
  } catch (error) {
    console.error('Failed to fetch transaction:', error);
    throw error;
  }
}

export async function updateTransaction(input: UpdateTransactionInput): Promise<Transaction> {
  try {
    // Verify transaction exists
    const existingTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (!existingTransaction.length) {
      throw new Error(`Transaction with ID ${input.id} not found`);
    }

    // Verify customer exists if being updated
    if (input.customer_id !== undefined) {
      const customer = await db.select()
        .from(customersTable)
        .where(eq(customersTable.id, input.customer_id))
        .execute();

      if (!customer.length) {
        throw new Error(`Customer with ID ${input.customer_id} not found`);
      }
    }

    // Verify courier exists if being updated and not null
    if (input.courier_id !== undefined && input.courier_id !== null) {
      const courier = await db.select()
        .from(couriersTable)
        .where(eq(couriersTable.id, input.courier_id))
        .execute();

      if (!courier.length) {
        throw new Error(`Courier with ID ${input.courier_id} not found`);
      }
    }

    // Prepare update values
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.customer_id !== undefined) updateValues.customer_id = input.customer_id;
    if (input.jersey_name !== undefined) updateValues.jersey_name = input.jersey_name;
    if (input.jersey_size !== undefined) updateValues.jersey_size = input.jersey_size;
    if (input.price !== undefined) updateValues.price = input.price.toString();
    if (input.quantity !== undefined) updateValues.quantity = input.quantity;
    if (input.total_payment !== undefined) updateValues.total_payment = input.total_payment.toString();
    if (input.payment_method !== undefined) updateValues.payment_method = input.payment_method;
    if (input.courier_id !== undefined) updateValues.courier_id = input.courier_id;
    if (input.order_status !== undefined) updateValues.order_status = input.order_status;
    if (input.transaction_date !== undefined) updateValues.transaction_date = input.transaction_date;
    if (input.notes !== undefined) updateValues.notes = input.notes;

    // Update transaction
    const result = await db.update(transactionsTable)
      .set(updateValues)
      .where(eq(transactionsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const transaction = result[0];
    return {
      ...transaction,
      price: parseFloat(transaction.price),
      total_payment: parseFloat(transaction.total_payment)
    };
  } catch (error) {
    console.error('Transaction update failed:', error);
    throw error;
  }
}

export async function deleteTransaction(id: number): Promise<void> {
  try {
    // Verify transaction exists
    const existingTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, id))
      .execute();

    if (!existingTransaction.length) {
      throw new Error(`Transaction with ID ${id} not found`);
    }

    // Delete transaction
    await db.delete(transactionsTable)
      .where(eq(transactionsTable.id, id))
      .execute();
  } catch (error) {
    console.error('Transaction deletion failed:', error);
    throw error;
  }
}

export async function generateTransactionReceipt(id: number): Promise<string> {
  try {
    // Get transaction with relations
    const transaction = await getTransactionById(id);
    if (!transaction) {
      throw new Error(`Transaction with ID ${id} not found`);
    }

    // Get shop settings for receipt template
    const shopSettings = await db.select()
      .from(shopSettingsTable)
      .limit(1)
      .execute();

    if (!shopSettings.length) {
      throw new Error('Shop settings not configured');
    }

    const settings = shopSettings[0];

    // Format date for receipt
    const formattedDate = transaction.transaction_date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const formattedTime = transaction.transaction_date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    // Calculate line total
    const lineTotal = transaction.price * transaction.quantity;

    // Generate receipt content (58mm thermal printer format)
    const receipt = `
${settings.shop_name}
${settings.shop_address}
${settings.shop_phone}
================================
STRUK PEMBELIAN
================================
No: ${transaction.id.toString().padStart(6, '0')}
Tgl: ${formattedDate} ${formattedTime}

Customer: ${transaction.customer.name}
Phone: ${transaction.customer.phone}
Address: ${transaction.customer.address}
${transaction.customer.city}, ${transaction.customer.province}
--------------------------------
Jersey: ${transaction.jersey_name}
Size: ${transaction.jersey_size}
Qty: ${transaction.quantity} x ${transaction.price.toLocaleString('id-ID')}
Total Item: ${lineTotal.toLocaleString('id-ID')}

TOTAL BAYAR: ${transaction.total_payment.toLocaleString('id-ID')}
Payment: ${transaction.payment_method}
${transaction.courier ? `Courier: ${transaction.courier.name} (${transaction.courier.code})` : ''}
Status: ${transaction.order_status.toUpperCase()}
${transaction.notes ? `\nCatatan: ${transaction.notes}` : ''}
================================
Terima kasih atas kepercayaan Anda!
${settings.receipt_template ? settings.receipt_template : ''}
================================
`.trim();

    return receipt;
  } catch (error) {
    console.error('Receipt generation failed:', error);
    throw error;
  }
}