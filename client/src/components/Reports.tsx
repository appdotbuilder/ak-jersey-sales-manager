import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  Filter,
  Calendar,
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign
} from 'lucide-react';
import type { 
  TransactionWithRelations, 
  Customer, 
  Courier,
  ReportFilter,
  OrderStatus,
  PaymentMethod
} from '../../../server/src/schema';

interface ReportStats {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  top_customer: string;
  top_product: string;
}

export default function Reports() {
  const [reportData, setReportData] = useState<TransactionWithRelations[]>([]);
  const [reportStats, setReportStats] = useState<ReportStats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [filters, setFilters] = useState<ReportFilter>({
    start_date: undefined,
    end_date: undefined,
    customer_id: undefined,
    courier_id: undefined,
    jersey_name: undefined,
    order_status: undefined,
    payment_method: undefined
  });

  const [salesReportData, setSalesReportData] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [productPerformance, setProductPerformance] = useState<any[]>([]);

  const loadReportData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getReportData.query({
        filter: filters,
        pagination: { page: 1, limit: -1 }
      });
      
      // Handle stub response gracefully
      if (result && Array.isArray(result)) {
        setReportData(result);
      } else {
        setReportData([]);
      }
    } catch (error) {
      console.error('Failed to load report data:', error);
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const loadReportStats = useCallback(async () => {
    try {
      const stats = await trpc.getReportStats.query(filters);
      if (stats && typeof stats === 'object') {
        // Ensure all required properties are present with defaults
        const reportStats: ReportStats = {
          total_revenue: (stats as any).total_revenue || 0,
          total_orders: (stats as any).total_orders || 0,
          avg_order_value: (stats as any).avg_order_value || 0,
          top_customer: (stats as any).top_customer || 'N/A',
          top_product: (stats as any).top_product || 'N/A'
        };
        setReportStats(reportStats);
      }
    } catch (error) {
      console.error('Failed to load report stats:', error);
    }
  }, [filters]);

  const loadSalesReport = useCallback(async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const result = await trpc.getSalesReportByPeriod.query({
        period: 'daily',
        startDate,
        endDate
      });
      setSalesReportData(result || []);
    } catch (error) {
      console.error('Failed to load sales report:', error);
      setSalesReportData([]);
    }
  }, []);

  const loadTopCustomers = useCallback(async () => {
    try {
      const result = await trpc.getTopCustomersReport.query({ limit: 10 });
      setTopCustomers(result || []);
    } catch (error) {
      console.error('Failed to load top customers:', error);
      setTopCustomers([]);
    }
  }, []);

  const loadProductPerformance = useCallback(async () => {
    try {
      const result = await trpc.getProductPerformanceReport.query();
      setProductPerformance(result || []);
    } catch (error) {
      console.error('Failed to load product performance:', error);
      setProductPerformance([]);
    }
  }, []);

  const loadCustomersAndCouriers = useCallback(async () => {
    try {
      const [customersResult, couriersResult] = await Promise.all([
        trpc.getCustomers.query({ page: 1, limit: -1 }),
        trpc.getAllCouriers.query()
      ]);
      
      // Handle customers response structure
      if (Array.isArray(customersResult)) {
        setCustomers(customersResult);
      } else if (customersResult && typeof customersResult === 'object' && 'customers' in customersResult) {
        setCustomers((customersResult as any).customers);
      } else {
        setCustomers([]);
      }
      
      // Handle couriers response structure
      if (Array.isArray(couriersResult)) {
        setCouriers(couriersResult);
      } else {
        setCouriers([]);
      }
    } catch (error) {
      console.error('Failed to load customers and couriers:', error);
      setCustomers([]);
      setCouriers([]);
    }
  }, []);

  useEffect(() => {
    loadReportData();
    loadReportStats();
    loadSalesReport();
    loadTopCustomers();
    loadProductPerformance();
    loadCustomersAndCouriers();
  }, [loadReportData, loadReportStats, loadSalesReport, loadTopCustomers, loadProductPerformance, loadCustomersAndCouriers]);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const result = await trpc.exportReportToExcel.query(filters);
      console.log('Excel export ready:', result);
      alert('Excel export is ready for implementation!');
    } catch (error) {
      console.error('Failed to export Excel:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const result = await trpc.exportReportToPdf.query(filters);
      console.log('PDF export ready:', result);
      alert('PDF export is ready for implementation!');
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      start_date: undefined,
      end_date: undefined,
      customer_id: undefined,
      courier_id: undefined,
      jersey_name: undefined,
      order_status: undefined,
      payment_method: undefined
    });
  };

  const getStatusBadge = (status: OrderStatus) => {
    const variants = {
      'pending': 'secondary',
      'in_process': 'default',
      'completed': 'outline',
      'returned': 'destructive'
    } as const;
    
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getPaymentMethodBadge = (method: PaymentMethod) => {
    const variants = {
      'COD': 'destructive',
      'Cash': 'default',
      'Transfer': 'secondary',
      'Shopee': 'outline'
    } as const;
    
    return <Badge variant={variants[method] || 'default'}>{method}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            📊 Business Reports & Analytics
          </CardTitle>
          <CardDescription>
            Generate comprehensive business reports and export data
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transaction Report</TabsTrigger>
          <TabsTrigger value="sales">Sales Analysis</TabsTrigger>
          <TabsTrigger value="customers">Customer Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Report Stats */}
          {reportStats && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Rp {reportStats.total_revenue.toLocaleString('id-ID')}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportStats.total_orders}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Rp {reportStats.avg_order_value.toLocaleString('id-ID')}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Customer</CardTitle>
                  <Users className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold truncate">{reportStats.top_customer}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Reports */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {salesReportData.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Sales trend data is ready for visualization.
                    <br />
                    <small className="text-xs">Chart integration available for real implementation.</small>
                  </p>
                ) : (
                  <div className="space-y-2">
                    {salesReportData.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{item.period}</span>
                        <span className="font-medium">Rp {item.revenue?.toLocaleString('id-ID') || '0'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
              </CardHeader>
              <CardContent>
                {productPerformance.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Product performance data is ready for analysis.
                    <br />
                    <small className="text-xs">Analytics ready for real data.</small>
                  </p>
                ) : (
                  <div className="space-y-2">
                    {productPerformance.slice(0, 5).map((product, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm truncate">{product.name}</span>
                        <Badge variant="secondary">{product.sales_count} sold</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Report Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={filters.start_date ? filters.start_date.toISOString().split('T')[0] : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFilters((prev: ReportFilter) => ({
                        ...prev,
                        start_date: e.target.value ? new Date(e.target.value) : undefined
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={filters.end_date ? filters.end_date.toISOString().split('T')[0] : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFilters((prev: ReportFilter) => ({
                        ...prev,
                        end_date: e.target.value ? new Date(e.target.value) : undefined
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Customer</Label>
                  <Select 
                    value={filters.customer_id?.toString() || ''} 
                    onValueChange={(value: string) =>
                      setFilters((prev: ReportFilter) => ({
                        ...prev,
                        customer_id: value ? parseInt(value) : undefined
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All customers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All customers</SelectItem>
                      {customers.map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Courier</Label>
                  <Select 
                    value={filters.courier_id?.toString() || ''} 
                    onValueChange={(value: string) =>
                      setFilters((prev: ReportFilter) => ({
                        ...prev,
                        courier_id: value ? parseInt(value) : undefined
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All couriers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All couriers</SelectItem>
                      {couriers.map((courier: Courier) => (
                        <SelectItem key={courier.id} value={courier.id.toString()}>
                          {courier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Product Name</Label>
                  <Input
                    placeholder="Search by jersey name"
                    value={filters.jersey_name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFilters((prev: ReportFilter) => ({
                        ...prev,
                        jersey_name: e.target.value || undefined
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Order Status</Label>
                  <Select 
                    value={filters.order_status || ''} 
                    onValueChange={(value: OrderStatus | '') =>
                      setFilters((prev: ReportFilter) => ({
                        ...prev,
                        order_status: value || undefined
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_process">In Process</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Payment Method</Label>
                  <Select 
                    value={filters.payment_method || ''} 
                    onValueChange={(value: PaymentMethod | '') =>
                      setFilters((prev: ReportFilter) => ({
                        ...prev,
                        payment_method: value || undefined
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All methods</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                      <SelectItem value="COD">COD</SelectItem>
                      <SelectItem value="Shopee">Shopee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
                <Button onClick={handleExportExcel} disabled={isExporting}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
                <Button onClick={handleExportPdf} disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Report Data */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Report Data</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Courier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No transactions found with current filters.
                            <br />
                            <small className="text-xs text-gray-400">
                              Report system is ready for real transaction data!
                            </small>
                          </TableCell>
                        </TableRow>
                      ) : (
                        reportData.map((transaction: TransactionWithRelations) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="text-sm">
                              {transaction.transaction_date.toLocaleDateString()}
                            </TableCell>
                            <TableCell>{transaction.customer.name}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{transaction.jersey_name}</div>
                                <div className="text-gray-500">Size: {transaction.jersey_size}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              Rp {transaction.total_payment.toLocaleString('id-ID')}
                            </TableCell>
                            <TableCell>
                              {getPaymentMethodBadge(transaction.payment_method)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(transaction.order_status)}
                            </TableCell>
                            <TableCell>
                              {transaction.courier ? (
                                <Badge variant="outline">{transaction.courier.code}</Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Performance Analysis</CardTitle>
              <CardDescription>Detailed sales metrics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Sales Analytics Ready</h3>
                <p>Advanced sales charts and metrics are ready for implementation.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Integration points available for Chart.js, Recharts, or similar libraries.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers Report</CardTitle>
            </CardHeader>
            <CardContent>
              {topCustomers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">Customer Analytics Ready</h3>
                  <p>Customer analysis and ranking system is prepared for implementation.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topCustomers.map((customer, index) => (
                    <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{customer.name}</h4>
                        <p className="text-sm text-gray-500">{customer.total_orders} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">Rp {customer.total_spent?.toLocaleString('id-ID')}</p>
                        <Badge variant="secondary">#{index + 1}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}