import { db } from '../db';
import { customersTable, couriersTable, transactionsTable } from '../db/schema';
import { type TransactionWithRelations, type ReportFilter, type PaginationInput } from '../schema';
import { eq, and, gte, lte, desc, sum, count, avg, sql, SQL } from 'drizzle-orm';

// Type definitions for report responses
export type ReportStats = {
    total_sales: number;
    total_orders: number;
    total_quantity: number;
    average_order_value: number;
};

export type SalesReportData = {
    period: string;
    total_sales: number;
    total_orders: number;
    total_quantity: number;
};

export type CustomerReportData = {
    customer_id: number;
    customer_name: string;
    total_orders: number;
    total_spent: number;
    last_order_date: Date;
};

export type ProductReportData = {
    jersey_name: string;
    jersey_size: string;
    total_quantity: number;
    total_sales: number;
    order_count: number;
};

export async function getReportData(
    filter: ReportFilter, 
    pagination: PaginationInput
): Promise<{ data: TransactionWithRelations[], total: number, stats: ReportStats }> {
    try {
        // Build base query with joins
        let baseQuery = db.select({
            id: transactionsTable.id,
            customer: {
                id: customersTable.id,
                name: customersTable.name,
                phone: customersTable.phone,
                address: customersTable.address,
                city: customersTable.city,
                province: customersTable.province,
                notes: customersTable.notes,
                created_at: customersTable.created_at,
                updated_at: customersTable.updated_at,
            },
            courier: {
                id: couriersTable.id,
                name: couriersTable.name,
                code: couriersTable.code,
                notes: couriersTable.notes,
                created_at: couriersTable.created_at,
                updated_at: couriersTable.updated_at,
            },
            jersey_name: transactionsTable.jersey_name,
            jersey_size: transactionsTable.jersey_size,
            price: transactionsTable.price,
            quantity: transactionsTable.quantity,
            total_payment: transactionsTable.total_payment,
            payment_method: transactionsTable.payment_method,
            order_status: transactionsTable.order_status,
            transaction_date: transactionsTable.transaction_date,
            notes: transactionsTable.notes,
            created_at: transactionsTable.created_at,
            updated_at: transactionsTable.updated_at,
        }).from(transactionsTable)
            .innerJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
            .leftJoin(couriersTable, eq(transactionsTable.courier_id, couriersTable.id));

        // Build conditions array
        const conditions: SQL<unknown>[] = [];

        if (filter.start_date) {
            conditions.push(gte(transactionsTable.transaction_date, filter.start_date));
        }

        if (filter.end_date) {
            conditions.push(lte(transactionsTable.transaction_date, filter.end_date));
        }

        if (filter.customer_id) {
            conditions.push(eq(transactionsTable.customer_id, filter.customer_id));
        }

        if (filter.courier_id) {
            conditions.push(eq(transactionsTable.courier_id, filter.courier_id));
        }

        if (filter.jersey_name) {
            conditions.push(eq(transactionsTable.jersey_name, filter.jersey_name));
        }

        if (filter.order_status) {
            conditions.push(eq(transactionsTable.order_status, filter.order_status));
        }

        if (filter.payment_method) {
            conditions.push(eq(transactionsTable.payment_method, filter.payment_method));
        }

        // Build final query with conditions
        const finalBaseQuery = conditions.length > 0 
            ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
            : baseQuery;

        // Get total count for pagination
        const countBaseQuery = db.select({ count: count() }).from(transactionsTable)
            .innerJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
            .leftJoin(couriersTable, eq(transactionsTable.courier_id, couriersTable.id));

        const countQuery = conditions.length > 0
            ? countBaseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
            : countBaseQuery;

        // Apply ordering and pagination to main query
        const orderedQuery = finalBaseQuery.orderBy(desc(transactionsTable.transaction_date));

        const finalQuery = pagination.limit !== -1 
            ? (() => {
                const offset = (pagination.page - 1) * pagination.limit;
                return orderedQuery.limit(pagination.limit).offset(offset);
            })()
            : orderedQuery;

        // Execute queries
        const [results, totalResults] = await Promise.all([
            finalQuery.execute(),
            countQuery.execute()
        ]);

        const total = Number(totalResults[0]?.count) || 0;

        // Transform results to match TransactionWithRelations type
        const data: TransactionWithRelations[] = results.map(result => ({
            id: result.id,
            customer: {
                ...result.customer,
                notes: result.customer.notes || null,
            },
            courier: result.courier ? {
                ...result.courier,
                notes: result.courier.notes || null,
            } : null,
            jersey_name: result.jersey_name,
            jersey_size: result.jersey_size,
            price: parseFloat(result.price),
            quantity: result.quantity,
            total_payment: parseFloat(result.total_payment),
            payment_method: result.payment_method,
            order_status: result.order_status,
            transaction_date: result.transaction_date,
            notes: result.notes || null,
            created_at: result.created_at,
            updated_at: result.updated_at,
        }));

        // Get stats for the filtered data
        const stats = await getReportStats(filter);

        return { data, total, stats };
    } catch (error) {
        console.error('Report data generation failed:', error);
        throw error;
    }
}

export async function getReportStats(filter: ReportFilter): Promise<ReportStats> {
    try {
        // Build base query
        let baseQuery = db.select({
            total_sales: sum(transactionsTable.total_payment),
            total_orders: count(),
            total_quantity: sum(transactionsTable.quantity),
        }).from(transactionsTable);

        // Build conditions array
        const conditions: SQL<unknown>[] = [];

        if (filter.start_date) {
            conditions.push(gte(transactionsTable.transaction_date, filter.start_date));
        }

        if (filter.end_date) {
            conditions.push(lte(transactionsTable.transaction_date, filter.end_date));
        }

        if (filter.customer_id) {
            conditions.push(eq(transactionsTable.customer_id, filter.customer_id));
        }

        if (filter.courier_id) {
            conditions.push(eq(transactionsTable.courier_id, filter.courier_id));
        }

        if (filter.jersey_name) {
            conditions.push(eq(transactionsTable.jersey_name, filter.jersey_name));
        }

        if (filter.order_status) {
            conditions.push(eq(transactionsTable.order_status, filter.order_status));
        }

        if (filter.payment_method) {
            conditions.push(eq(transactionsTable.payment_method, filter.payment_method));
        }

        // Apply filters
        const query = conditions.length > 0
            ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
            : baseQuery;

        const results = await query.execute();
        const result = results[0];

        const totalSales = result?.total_sales ? parseFloat(result.total_sales.toString()) : 0;
        const totalOrders = Number(result?.total_orders) || 0;
        const totalQuantity = Number(result?.total_quantity) || 0;
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        return {
            total_sales: totalSales,
            total_orders: totalOrders,
            total_quantity: totalQuantity,
            average_order_value: averageOrderValue,
        };
    } catch (error) {
        console.error('Report stats calculation failed:', error);
        throw error;
    }
}

export async function exportReportToExcel(filter: ReportFilter): Promise<Buffer> {
    try {
        // For now, return a simple CSV-like buffer since we don't have Excel library
        // In a real implementation, you would use a library like 'exceljs'
        const { data } = await getReportData(filter, { page: 1, limit: -1 });
        
        const headers = [
            'Transaction ID',
            'Date',
            'Customer Name',
            'Jersey Name',
            'Jersey Size',
            'Price',
            'Quantity',
            'Total Payment',
            'Payment Method',
            'Order Status',
            'Courier',
            'Notes'
        ].join(',');

        const rows = data.map(transaction => [
            transaction.id,
            transaction.transaction_date.toISOString().split('T')[0],
            `"${transaction.customer.name}"`,
            `"${transaction.jersey_name}"`,
            `"${transaction.jersey_size}"`,
            transaction.price,
            transaction.quantity,
            transaction.total_payment,
            transaction.payment_method,
            transaction.order_status,
            transaction.courier ? `"${transaction.courier.name}"` : '',
            transaction.notes ? `"${transaction.notes}"` : ''
        ].join(','));

        const csv = [headers, ...rows].join('\n');
        return Buffer.from(csv, 'utf8');
    } catch (error) {
        console.error('Excel export failed:', error);
        throw error;
    }
}

export async function exportReportToPdf(filter: ReportFilter): Promise<Buffer> {
    try {
        // For now, return a simple text buffer since we don't have PDF library
        // In a real implementation, you would use a library like 'pdfkit' or 'puppeteer'
        const { data, stats } = await getReportData(filter, { page: 1, limit: -1 });
        
        let content = 'SALES REPORT\n';
        content += '=============\n\n';
        content += `Generated: ${new Date().toISOString()}\n\n`;
        content += 'SUMMARY:\n';
        content += `Total Sales: $${stats.total_sales.toFixed(2)}\n`;
        content += `Total Orders: ${stats.total_orders}\n`;
        content += `Total Quantity: ${stats.total_quantity}\n`;
        content += `Average Order Value: $${stats.average_order_value.toFixed(2)}\n\n`;
        content += 'TRANSACTIONS:\n';
        content += '-'.repeat(80) + '\n';

        data.forEach(transaction => {
            content += `ID: ${transaction.id} | Date: ${transaction.transaction_date.toISOString().split('T')[0]}\n`;
            content += `Customer: ${transaction.customer.name}\n`;
            content += `Jersey: ${transaction.jersey_name} (${transaction.jersey_size})\n`;
            content += `Amount: $${transaction.total_payment} | Status: ${transaction.order_status}\n`;
            content += '-'.repeat(80) + '\n';
        });

        return Buffer.from(content, 'utf8');
    } catch (error) {
        console.error('PDF export failed:', error);
        throw error;
    }
}

export async function getSalesReportByPeriod(
    period: 'daily' | 'weekly' | 'monthly', 
    startDate: Date, 
    endDate: Date
): Promise<SalesReportData[]> {
    try {
        let dateFormat: string;
        
        switch (period) {
            case 'daily':
                dateFormat = 'YYYY-MM-DD';
                break;
            case 'weekly':
                dateFormat = 'YYYY-"W"WW';
                break;
            case 'monthly':
                dateFormat = 'YYYY-MM';
                break;
            default:
                dateFormat = 'YYYY-MM-DD';
        }

        // Create the date expression as a variable to ensure consistency
        const dateExpression = sql<string>`TO_CHAR(${transactionsTable.transaction_date}, '${sql.raw(dateFormat)}')`;

        const results = await db.select({
            period: dateExpression,
            total_sales: sum(transactionsTable.total_payment),
            total_orders: count(transactionsTable.id),
            total_quantity: sum(transactionsTable.quantity),
        })
            .from(transactionsTable)
            .where(and(
                gte(transactionsTable.transaction_date, startDate),
                lte(transactionsTable.transaction_date, endDate)
            ))
            .groupBy(dateExpression)
            .orderBy(dateExpression)
            .execute();

        return results.map(result => ({
            period: result.period,
            total_sales: result.total_sales ? parseFloat(result.total_sales.toString()) : 0,
            total_orders: Number(result.total_orders) || 0,
            total_quantity: Number(result.total_quantity) || 0,
        }));
    } catch (error) {
        console.error('Sales report by period failed:', error);
        throw error;
    }
}

export async function getTopCustomersReport(limit: number = 10): Promise<CustomerReportData[]> {
    try {
        const results = await db.select({
            customer_id: customersTable.id,
            customer_name: customersTable.name,
            total_orders: count(transactionsTable.id),
            total_spent: sum(transactionsTable.total_payment),
            last_order_date: sql<string>`MAX(${transactionsTable.transaction_date})::text`,
        })
            .from(customersTable)
            .innerJoin(transactionsTable, eq(customersTable.id, transactionsTable.customer_id))
            .groupBy(customersTable.id, customersTable.name)
            .orderBy(desc(sum(transactionsTable.total_payment)))
            .limit(limit)
            .execute();

        return results.map(result => ({
            customer_id: result.customer_id,
            customer_name: result.customer_name,
            total_orders: Number(result.total_orders) || 0,
            total_spent: result.total_spent ? parseFloat(result.total_spent.toString()) : 0,
            last_order_date: new Date(result.last_order_date),
        }));
    } catch (error) {
        console.error('Top customers report failed:', error);
        throw error;
    }
}

export async function getProductPerformanceReport(): Promise<ProductReportData[]> {
    try {
        const results = await db.select({
            jersey_name: transactionsTable.jersey_name,
            jersey_size: transactionsTable.jersey_size,
            total_quantity: sum(transactionsTable.quantity),
            total_sales: sum(transactionsTable.total_payment),
            order_count: count(transactionsTable.id),
        })
            .from(transactionsTable)
            .groupBy(transactionsTable.jersey_name, transactionsTable.jersey_size)
            .orderBy(desc(sum(transactionsTable.total_payment)))
            .execute();

        return results.map(result => ({
            jersey_name: result.jersey_name,
            jersey_size: result.jersey_size,
            total_quantity: Number(result.total_quantity) || 0,
            total_sales: result.total_sales ? parseFloat(result.total_sales.toString()) : 0,
            order_count: Number(result.order_count) || 0,
        }));
    } catch (error) {
        console.error('Product performance report failed:', error);
        throw error;
    }
}