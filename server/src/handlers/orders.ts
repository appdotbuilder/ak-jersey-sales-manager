import { db } from '../db';
import { transactionsTable, customersTable, couriersTable, shopSettingsTable } from '../db/schema';
import { type TransactionWithRelations, type PaginationInput, type OrderStatus } from '../schema';
import { eq, like, or, ilike, count, sql, desc, and, SQL } from 'drizzle-orm';

export async function getOrdersByStatus(status: OrderStatus, pagination: PaginationInput): Promise<{ orders: TransactionWithRelations[], total: number }> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Filter by status
    conditions.push(eq(transactionsTable.order_status, status));

    // Add search functionality
    if (pagination.search && pagination.search.trim() !== '') {
      const searchTerm = `%${pagination.search.trim()}%`;
      conditions.push(
        or(
          ilike(customersTable.name, searchTerm),
          ilike(transactionsTable.jersey_name, searchTerm),
          sql`${transactionsTable.id}::text ILIKE ${searchTerm}`
        )!
      );
    }

    const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);

    // Build complete query in one chain
    const baseQuery = db.select({
      id: transactionsTable.id,
      customer_id: transactionsTable.customer_id,
      jersey_name: transactionsTable.jersey_name,
      jersey_size: transactionsTable.jersey_size,
      price: transactionsTable.price,
      quantity: transactionsTable.quantity,
      total_payment: transactionsTable.total_payment,
      payment_method: transactionsTable.payment_method,
      courier_id: transactionsTable.courier_id,
      order_status: transactionsTable.order_status,
      transaction_date: transactionsTable.transaction_date,
      notes: transactionsTable.notes,
      created_at: transactionsTable.created_at,
      updated_at: transactionsTable.updated_at,
      customer: {
        id: customersTable.id,
        name: customersTable.name,
        phone: customersTable.phone,
        address: customersTable.address,
        city: customersTable.city,
        province: customersTable.province,
        notes: customersTable.notes,
        created_at: customersTable.created_at,
        updated_at: customersTable.updated_at
      },
      courier: {
        id: couriersTable.id,
        name: couriersTable.name,
        code: couriersTable.code,
        notes: couriersTable.notes,
        created_at: couriersTable.created_at,
        updated_at: couriersTable.updated_at
      }
    })
      .from(transactionsTable)
      .innerJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
      .leftJoin(couriersTable, eq(transactionsTable.courier_id, couriersTable.id))
      .where(whereCondition)
      .orderBy(desc(transactionsTable.created_at));

    // Execute query with or without pagination
    const results = pagination.limit === -1 
      ? await baseQuery.execute()
      : await baseQuery.limit(pagination.limit).offset((pagination.page - 1) * pagination.limit).execute();

    // Get total count for pagination
    const totalResult = await db.select({ count: count() })
      .from(transactionsTable)
      .innerJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
      .where(whereCondition)
      .execute();

    const total = totalResult[0]?.count || 0;

    // Transform results to match TransactionWithRelations schema
    const orders: TransactionWithRelations[] = results.map(result => ({
      id: result.id,
      customer: {
        id: result.customer.id,
        name: result.customer.name,
        phone: result.customer.phone,
        address: result.customer.address,
        city: result.customer.city,
        province: result.customer.province,
        notes: result.customer.notes,
        created_at: result.customer.created_at,
        updated_at: result.customer.updated_at
      },
      courier: result.courier && result.courier.id ? {
        id: result.courier.id,
        name: result.courier.name,
        code: result.courier.code,
        notes: result.courier.notes,
        created_at: result.courier.created_at,
        updated_at: result.courier.updated_at
      } : null,
      jersey_name: result.jersey_name,
      jersey_size: result.jersey_size,
      price: parseFloat(result.price),
      quantity: result.quantity,
      total_payment: parseFloat(result.total_payment),
      payment_method: result.payment_method,
      order_status: result.order_status,
      transaction_date: result.transaction_date,
      notes: result.notes,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));

    return { orders, total: Number(total) };
  } catch (error) {
    console.error('Failed to get orders by status:', error);
    throw error;
  }
}

export async function getAllOrders(pagination: PaginationInput): Promise<{ orders: TransactionWithRelations[], total: number }> {
  try {
    // Build search conditions
    const hasSearch = pagination.search && pagination.search.trim() !== '';
    const searchTerm = hasSearch ? `%${pagination.search!.trim()}%` : '';
    
    const searchCondition = hasSearch ? or(
      ilike(customersTable.name, searchTerm),
      ilike(transactionsTable.jersey_name, searchTerm),
      sql`${transactionsTable.id}::text ILIKE ${searchTerm}`
    )! : undefined;

    // Build base query
    const baseQuery = db.select({
      id: transactionsTable.id,
      customer_id: transactionsTable.customer_id,
      jersey_name: transactionsTable.jersey_name,
      jersey_size: transactionsTable.jersey_size,
      price: transactionsTable.price,
      quantity: transactionsTable.quantity,
      total_payment: transactionsTable.total_payment,
      payment_method: transactionsTable.payment_method,
      courier_id: transactionsTable.courier_id,
      order_status: transactionsTable.order_status,
      transaction_date: transactionsTable.transaction_date,
      notes: transactionsTable.notes,
      created_at: transactionsTable.created_at,
      updated_at: transactionsTable.updated_at,
      customer: {
        id: customersTable.id,
        name: customersTable.name,
        phone: customersTable.phone,
        address: customersTable.address,
        city: customersTable.city,
        province: customersTable.province,
        notes: customersTable.notes,
        created_at: customersTable.created_at,
        updated_at: customersTable.updated_at
      },
      courier: {
        id: couriersTable.id,
        name: couriersTable.name,
        code: couriersTable.code,
        notes: couriersTable.notes,
        created_at: couriersTable.created_at,
        updated_at: couriersTable.updated_at
      }
    })
      .from(transactionsTable)
      .innerJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
      .leftJoin(couriersTable, eq(transactionsTable.courier_id, couriersTable.id));

    // Execute query with or without search and pagination
    let results;
    if (hasSearch) {
      if (pagination.limit === -1) {
        results = await baseQuery
          .where(searchCondition!)
          .orderBy(desc(transactionsTable.created_at))
          .execute();
      } else {
        results = await baseQuery
          .where(searchCondition!)
          .orderBy(desc(transactionsTable.created_at))
          .limit(pagination.limit)
          .offset((pagination.page - 1) * pagination.limit)
          .execute();
      }
    } else {
      if (pagination.limit === -1) {
        results = await baseQuery
          .orderBy(desc(transactionsTable.created_at))
          .execute();
      } else {
        results = await baseQuery
          .orderBy(desc(transactionsTable.created_at))
          .limit(pagination.limit)
          .offset((pagination.page - 1) * pagination.limit)
          .execute();
      }
    }

    // Get total count for pagination
    let totalResult;
    if (hasSearch) {
      totalResult = await db.select({ count: count() })
        .from(transactionsTable)
        .innerJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
        .where(searchCondition!)
        .execute();
    } else {
      totalResult = await db.select({ count: count() })
        .from(transactionsTable)
        .execute();
    }

    const total = totalResult[0]?.count || 0;

    // Transform results to match TransactionWithRelations schema
    const orders: TransactionWithRelations[] = results.map(result => ({
      id: result.id,
      customer: {
        id: result.customer.id,
        name: result.customer.name,
        phone: result.customer.phone,
        address: result.customer.address,
        city: result.customer.city,
        province: result.customer.province,
        notes: result.customer.notes,
        created_at: result.customer.created_at,
        updated_at: result.customer.updated_at
      },
      courier: result.courier && result.courier.id ? {
        id: result.courier.id,
        name: result.courier.name,
        code: result.courier.code,
        notes: result.courier.notes,
        created_at: result.courier.created_at,
        updated_at: result.courier.updated_at
      } : null,
      jersey_name: result.jersey_name,
      jersey_size: result.jersey_size,
      price: parseFloat(result.price),
      quantity: result.quantity,
      total_payment: parseFloat(result.total_payment),
      payment_method: result.payment_method,
      order_status: result.order_status,
      transaction_date: result.transaction_date,
      notes: result.notes,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));

    return { orders, total: Number(total) };
  } catch (error) {
    console.error('Failed to get all orders:', error);
    throw error;
  }
}

export async function getOrderById(id: number): Promise<TransactionWithRelations | null> {
  try {
    const results = await db.select({
      id: transactionsTable.id,
      customer_id: transactionsTable.customer_id,
      jersey_name: transactionsTable.jersey_name,
      jersey_size: transactionsTable.jersey_size,
      price: transactionsTable.price,
      quantity: transactionsTable.quantity,
      total_payment: transactionsTable.total_payment,
      payment_method: transactionsTable.payment_method,
      courier_id: transactionsTable.courier_id,
      order_status: transactionsTable.order_status,
      transaction_date: transactionsTable.transaction_date,
      notes: transactionsTable.notes,
      created_at: transactionsTable.created_at,
      updated_at: transactionsTable.updated_at,
      customer: {
        id: customersTable.id,
        name: customersTable.name,
        phone: customersTable.phone,
        address: customersTable.address,
        city: customersTable.city,
        province: customersTable.province,
        notes: customersTable.notes,
        created_at: customersTable.created_at,
        updated_at: customersTable.updated_at
      },
      courier: {
        id: couriersTable.id,
        name: couriersTable.name,
        code: couriersTable.code,
        notes: couriersTable.notes,
        created_at: couriersTable.created_at,
        updated_at: couriersTable.updated_at
      }
    })
      .from(transactionsTable)
      .innerJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
      .leftJoin(couriersTable, eq(transactionsTable.courier_id, couriersTable.id))
      .where(eq(transactionsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];

    return {
      id: result.id,
      customer: {
        id: result.customer.id,
        name: result.customer.name,
        phone: result.customer.phone,
        address: result.customer.address,
        city: result.customer.city,
        province: result.customer.province,
        notes: result.customer.notes,
        created_at: result.customer.created_at,
        updated_at: result.customer.updated_at
      },
      courier: result.courier && result.courier.id ? {
        id: result.courier.id,
        name: result.courier.name,
        code: result.courier.code,
        notes: result.courier.notes,
        created_at: result.courier.created_at,
        updated_at: result.courier.updated_at
      } : null,
      jersey_name: result.jersey_name,
      jersey_size: result.jersey_size,
      price: parseFloat(result.price),
      quantity: result.quantity,
      total_payment: parseFloat(result.total_payment),
      payment_method: result.payment_method,
      order_status: result.order_status,
      transaction_date: result.transaction_date,
      notes: result.notes,
      created_at: result.created_at,
      updated_at: result.updated_at
    };
  } catch (error) {
    console.error('Failed to get order by ID:', error);
    throw error;
  }
}

export async function updateOrderStatus(input: { id: number, order_status: OrderStatus }): Promise<TransactionWithRelations> {
  try {
    // Update the order status
    const updateResult = await db.update(transactionsTable)
      .set({
        order_status: input.order_status,
        updated_at: new Date()
      })
      .where(eq(transactionsTable.id, input.id))
      .returning()
      .execute();

    if (updateResult.length === 0) {
      throw new Error(`Order with ID ${input.id} not found`);
    }

    // Fetch the updated order with relations
    const order = await getOrderById(input.id);
    
    if (!order) {
      throw new Error(`Failed to retrieve updated order with ID ${input.id}`);
    }

    return order;
  } catch (error) {
    console.error('Failed to update order status:', error);
    throw error;
  }
}

export async function getOrderStatusCounts(): Promise<{ total: number, pending: number, in_process: number, completed: number, returned: number }> {
  try {
    const results = await db.select({
      order_status: transactionsTable.order_status,
      count: count()
    })
      .from(transactionsTable)
      .groupBy(transactionsTable.order_status)
      .execute();

    // Initialize counts
    const counts = {
      total: 0,
      pending: 0,
      in_process: 0,
      completed: 0,
      returned: 0
    };

    // Populate counts from results
    results.forEach(result => {
      const statusCount = Number(result.count);
      counts.total += statusCount;
      
      switch (result.order_status) {
        case 'pending':
          counts.pending = statusCount;
          break;
        case 'in_process':
          counts.in_process = statusCount;
          break;
        case 'completed':
          counts.completed = statusCount;
          break;
        case 'returned':
          counts.returned = statusCount;
          break;
      }
    });

    return counts;
  } catch (error) {
    console.error('Failed to get order status counts:', error);
    throw error;
  }
}

export async function deleteOrder(id: number): Promise<void> {
  try {
    const result = await db.delete(transactionsTable)
      .where(eq(transactionsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Order with ID ${id} not found`);
    }
  } catch (error) {
    console.error('Failed to delete order:', error);
    throw error;
  }
}

export async function generateOrderReceipt(id: number): Promise<string> {
  try {
    // Fetch the order with relations
    const order = await getOrderById(id);
    if (!order) {
      throw new Error(`Order with ID ${id} not found`);
    }

    // Fetch shop settings for receipt template
    const shopSettingsResult = await db.select()
      .from(shopSettingsTable)
      .limit(1)
      .execute();

    const shopSettings = shopSettingsResult[0];
    if (!shopSettings) {
      throw new Error('Shop settings not found');
    }

    // Format order data for 58mm thermal printer
    const receipt = formatReceiptFor58mm(order, shopSettings);
    return receipt;
  } catch (error) {
    console.error('Failed to generate order receipt:', error);
    throw error;
  }
}

function formatReceiptFor58mm(order: TransactionWithRelations, shopSettings: any): string {
  const line = '--------------------------------';
  const formatPrice = (price: number) => `Rp ${price.toLocaleString('id-ID')}`;
  const formatDate = (date: Date) => date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
${shopSettings.shop_name}
${shopSettings.shop_address}
${shopSettings.shop_phone}

${line}
STRUK PEMBELIAN
${line}

No. Order: ${order.id}
Tanggal: ${formatDate(order.transaction_date)}

Customer:
${order.customer.name}
${order.customer.phone}
${order.customer.address}
${order.customer.city}, ${order.customer.province}

${line}
DETAIL ORDER
${line}

Jersey: ${order.jersey_name}
Size: ${order.jersey_size}
Harga: ${formatPrice(order.price)}
Qty: ${order.quantity}
Total: ${formatPrice(order.total_payment)}

${line}
Pembayaran: ${order.payment_method}
${order.courier ? `Kurir: ${order.courier.name} (${order.courier.code})` : 'Kurir: -'}
Status: ${order.order_status.toUpperCase()}

${order.notes ? `\nCatatan:\n${order.notes}` : ''}

${line}
Terima kasih atas pembelian Anda!
${line}
`.trim();
}