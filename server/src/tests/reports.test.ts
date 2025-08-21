import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, couriersTable, transactionsTable } from '../db/schema';
import { type ReportFilter, type PaginationInput } from '../schema';
import {
    getReportData,
    getReportStats,
    exportReportToExcel,
    exportReportToPdf,
    getSalesReportByPeriod,
    getTopCustomersReport,
    getProductPerformanceReport
} from '../handlers/reports';

describe('Reports Handler', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    // Helper function to create test data
    const createTestData = async () => {
        // Create customers
        const customers = await db.insert(customersTable)
            .values([
                {
                    name: 'John Doe',
                    phone: '123456789',
                    address: '123 Main St',
                    city: 'Jakarta',
                    province: 'DKI Jakarta'
                },
                {
                    name: 'Jane Smith',
                    phone: '987654321',
                    address: '456 Oak Ave',
                    city: 'Bandung',
                    province: 'West Java'
                }
            ])
            .returning()
            .execute();

        // Create couriers
        const couriers = await db.insert(couriersTable)
            .values([
                {
                    name: 'JNE Express',
                    code: 'JNE'
                },
                {
                    name: 'GoSend',
                    code: 'GOSEND'
                }
            ])
            .returning()
            .execute();

        // Create transactions
        const baseDate = new Date('2024-01-01');
        const transactions = await db.insert(transactionsTable)
            .values([
                {
                    customer_id: customers[0].id,
                    jersey_name: 'Arsenal Home',
                    jersey_size: 'M',
                    price: '100.00',
                    quantity: 2,
                    total_payment: '200.00',
                    payment_method: 'Cash',
                    courier_id: couriers[0].id,
                    order_status: 'completed',
                    transaction_date: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000)
                },
                {
                    customer_id: customers[1].id,
                    jersey_name: 'Barcelona Away',
                    jersey_size: 'L',
                    price: '120.00',
                    quantity: 1,
                    total_payment: '120.00',
                    payment_method: 'Transfer',
                    courier_id: couriers[1].id,
                    order_status: 'pending',
                    transaction_date: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000)
                },
                {
                    customer_id: customers[0].id,
                    jersey_name: 'Arsenal Home',
                    jersey_size: 'L',
                    price: '100.00',
                    quantity: 1,
                    total_payment: '100.00',
                    payment_method: 'COD',
                    courier_id: couriers[0].id,
                    order_status: 'completed',
                    transaction_date: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000)
                }
            ])
            .returning()
            .execute();

        return { customers, couriers, transactions };
    };

    describe('getReportData', () => {
        it('should return all transactions with default pagination', async () => {
            await createTestData();

            const filter: ReportFilter = {};
            const pagination: PaginationInput = { page: 1, limit: 20 };

            const result = await getReportData(filter, pagination);

            expect(result.data).toHaveLength(3);
            expect(result.total).toBe(3);
            expect(result.stats.total_orders).toBe(3);
            expect(result.stats.total_sales).toBe(420);

            // Verify transaction structure
            const firstTransaction = result.data[0];
            expect(firstTransaction.customer).toBeDefined();
            expect(firstTransaction.customer.name).toBeDefined();
            expect(typeof firstTransaction.price).toBe('number');
            expect(typeof firstTransaction.total_payment).toBe('number');
        });

        it('should filter transactions by date range', async () => {
            await createTestData();

            const filter: ReportFilter = {
                start_date: new Date('2024-01-01'),
                end_date: new Date('2024-01-03')
            };
            const pagination: PaginationInput = { page: 1, limit: 20 };

            const result = await getReportData(filter, pagination);

            expect(result.data).toHaveLength(2);
            expect(result.total).toBe(2);
        });

        it('should filter transactions by customer', async () => {
            const { customers } = await createTestData();

            const filter: ReportFilter = {
                customer_id: customers[0].id
            };
            const pagination: PaginationInput = { page: 1, limit: 20 };

            const result = await getReportData(filter, pagination);

            expect(result.data).toHaveLength(2);
            result.data.forEach(transaction => {
                expect(transaction.customer.id).toBe(customers[0].id);
            });
        });

        it('should filter transactions by order status', async () => {
            await createTestData();

            const filter: ReportFilter = {
                order_status: 'completed'
            };
            const pagination: PaginationInput = { page: 1, limit: 20 };

            const result = await getReportData(filter, pagination);

            expect(result.data).toHaveLength(2);
            result.data.forEach(transaction => {
                expect(transaction.order_status).toBe('completed');
            });
        });

        it('should handle pagination correctly', async () => {
            await createTestData();

            const filter: ReportFilter = {};
            const pagination: PaginationInput = { page: 1, limit: 2 };

            const result = await getReportData(filter, pagination);

            expect(result.data).toHaveLength(2);
            expect(result.total).toBe(3);
        });

        it('should return all records when limit is -1', async () => {
            await createTestData();

            const filter: ReportFilter = {};
            const pagination: PaginationInput = { page: 1, limit: -1 };

            const result = await getReportData(filter, pagination);

            expect(result.data).toHaveLength(3);
            expect(result.total).toBe(3);
        });
    });

    describe('getReportStats', () => {
        it('should calculate correct statistics', async () => {
            await createTestData();

            const filter: ReportFilter = {};
            const stats = await getReportStats(filter);

            expect(stats.total_sales).toBe(420);
            expect(stats.total_orders).toBe(3);
            expect(stats.total_quantity).toBe(4);
            expect(stats.average_order_value).toBe(140);
        });

        it('should calculate filtered statistics', async () => {
            await createTestData();

            const filter: ReportFilter = {
                order_status: 'completed'
            };
            const stats = await getReportStats(filter);

            expect(stats.total_sales).toBe(300);
            expect(stats.total_orders).toBe(2);
            expect(stats.total_quantity).toBe(3);
            expect(stats.average_order_value).toBe(150);
        });

        it('should handle empty results', async () => {
            const filter: ReportFilter = {
                start_date: new Date('2025-01-01'),
                end_date: new Date('2025-01-02')
            };
            const stats = await getReportStats(filter);

            expect(stats.total_sales).toBe(0);
            expect(stats.total_orders).toBe(0);
            expect(stats.total_quantity).toBe(0);
            expect(stats.average_order_value).toBe(0);
        });
    });

    describe('exportReportToExcel', () => {
        it('should export report data to CSV format', async () => {
            await createTestData();

            const filter: ReportFilter = {};
            const buffer = await exportReportToExcel(filter);

            expect(buffer).toBeInstanceOf(Buffer);
            const content = buffer.toString('utf8');
            expect(content).toContain('Transaction ID');
            expect(content).toContain('Arsenal Home');
            expect(content).toContain('Barcelona Away');
        });

        it('should export filtered data', async () => {
            await createTestData();

            const filter: ReportFilter = {
                order_status: 'completed'
            };
            const buffer = await exportReportToExcel(filter);

            const content = buffer.toString('utf8');
            expect(content).toContain('completed');
            expect(content).not.toContain('pending');
        });
    });

    describe('exportReportToPdf', () => {
        it('should export report data to text format', async () => {
            await createTestData();

            const filter: ReportFilter = {};
            const buffer = await exportReportToPdf(filter);

            expect(buffer).toBeInstanceOf(Buffer);
            const content = buffer.toString('utf8');
            expect(content).toContain('SALES REPORT');
            expect(content).toContain('Total Sales: $420.00');
            expect(content).toContain('Arsenal Home');
        });
    });

    describe('getSalesReportByPeriod', () => {
        it('should generate daily sales report', async () => {
            await createTestData();

            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-10');

            const report = await getSalesReportByPeriod('daily', startDate, endDate);

            expect(report).toHaveLength(3);
            expect(report[0].period).toMatch(/2024-01-\d{2}/);
            expect(typeof report[0].total_sales).toBe('number');
            expect(typeof report[0].total_orders).toBe('number');
        });

        it('should generate weekly sales report', async () => {
            await createTestData();

            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');

            const report = await getSalesReportByPeriod('weekly', startDate, endDate);

            expect(report.length).toBeGreaterThan(0);
            report.forEach(period => {
                expect(period.period).toMatch(/2024-W\d{2}/);
            });
        });

        it('should generate monthly sales report', async () => {
            await createTestData();

            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-12-31');

            const report = await getSalesReportByPeriod('monthly', startDate, endDate);

            expect(report).toHaveLength(1);
            expect(report[0].period).toBe('2024-01');
            expect(report[0].total_sales).toBe(420);
        });
    });

    describe('getTopCustomersReport', () => {
        it('should return top customers by total spent', async () => {
            const { customers } = await createTestData();

            const report = await getTopCustomersReport(5);

            expect(report).toHaveLength(2);
            expect(report[0].customer_id).toBe(customers[0].id);
            expect(report[0].customer_name).toBe('John Doe');
            expect(report[0].total_spent).toBe(300);
            expect(report[0].total_orders).toBe(2);
            expect(report[0].last_order_date).toBeInstanceOf(Date);
        });

        it('should respect the limit parameter', async () => {
            await createTestData();

            const report = await getTopCustomersReport(1);

            expect(report).toHaveLength(1);
            expect(report[0].customer_name).toBe('John Doe');
        });
    });

    describe('getProductPerformanceReport', () => {
        it('should return product performance data', async () => {
            await createTestData();

            const report = await getProductPerformanceReport();

            expect(report).toHaveLength(3); // Arsenal Home M, Arsenal Home L, Barcelona Away L
            
            // Find Arsenal Home M (should be top performer)
            const arsenalHomeM = report.find(p => 
                p.jersey_name === 'Arsenal Home' && p.jersey_size === 'M'
            );
            expect(arsenalHomeM).toBeDefined();
            expect(arsenalHomeM!.total_sales).toBe(200);
            expect(arsenalHomeM!.total_quantity).toBe(2);
            expect(arsenalHomeM!.order_count).toBe(1);
        });

        it('should sort products by total sales descending', async () => {
            await createTestData();

            const report = await getProductPerformanceReport();

            // Arsenal Home M should be first (200), then Barcelona Away L (120), then Arsenal Home L (100)
            expect(report[0].total_sales).toBeGreaterThanOrEqual(report[1].total_sales);
            expect(report[1].total_sales).toBeGreaterThanOrEqual(report[2].total_sales);
        });
    });
});