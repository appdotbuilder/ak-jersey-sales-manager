import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/utils/trpc';
import { Plus, Edit, Trash2, Search, Receipt, Printer, Calendar } from 'lucide-react';
import type { 
  TransactionWithRelations, 
  CreateTransactionInput, 
  UpdateTransactionInput, 
  Customer, 
  Courier,
  PaymentMethod 
} from '../../../server/src/schema';

export default function Transactions() {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateTransactionInput>({
    customer_id: 0,
    jersey_name: '',
    jersey_size: '',
    price: 0,
    quantity: 1,
    total_payment: 0,
    payment_method: 'Cash' as PaymentMethod,
    courier_id: null,
    transaction_date: new Date(),
    notes: null
  });

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      // Note: The API returns { transactions, total } structure
      const result = await trpc.getTransactions.query({
        page,
        limit,
        search: searchTerm || undefined
      });
      // Handle the stub response structure
      if (result && typeof result === 'object' && 'transactions' in result) {
        setTransactions(result.transactions);
      } else {
        // Fallback for direct array response
        setTransactions(result as TransactionWithRelations[]);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      // Handle stub mode gracefully
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchTerm]);

  const loadCustomers = useCallback(async () => {
    try {
      const result = await trpc.getCustomers.query({ page: 1, limit: -1 });
      // Handle response structure - extract array from response
      if (Array.isArray(result)) {
        setCustomers(result);
      } else if (result && typeof result === 'object' && 'customers' in result) {
        setCustomers((result as any).customers);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
    }
  }, []);

  const loadCouriers = useCallback(async () => {
    try {
      const result = await trpc.getAllCouriers.query();
      setCouriers(result);
    } catch (error) {
      console.error('Failed to load couriers:', error);
      setCouriers([]);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    loadCustomers();
    loadCouriers();
  }, [loadTransactions, loadCustomers, loadCouriers]);

  // Auto-calculate total payment when price or quantity changes
  useEffect(() => {
    const total = formData.price * formData.quantity;
    setFormData((prev: CreateTransactionInput) => ({ ...prev, total_payment: total }));
  }, [formData.price, formData.quantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingTransaction) {
        const updateData: UpdateTransactionInput = {
          id: editingTransaction.id,
          ...formData
        };
        await trpc.updateTransaction.mutate(updateData);
      } else {
        await trpc.createTransaction.mutate(formData);
      }

      setIsDialogOpen(false);
      setEditingTransaction(null);
      resetForm();
      loadTransactions();
    } catch (error) {
      console.error('Failed to save transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (transaction: TransactionWithRelations) => {
    setEditingTransaction(transaction);
    setFormData({
      customer_id: transaction.customer.id,
      jersey_name: transaction.jersey_name,
      jersey_size: transaction.jersey_size,
      price: transaction.price,
      quantity: transaction.quantity,
      total_payment: transaction.total_payment,
      payment_method: transaction.payment_method,
      courier_id: transaction.courier?.id || null,
      transaction_date: transaction.transaction_date,
      notes: transaction.notes
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteTransaction.mutate({ id });
      loadTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const handlePrintReceipt = async (id: number) => {
    try {
      const receipt = await trpc.generateTransactionReceipt.query({ id });
      console.log('Receipt:', receipt);
      // In a real app, this would integrate with thermal printer
      alert('Receipt generation is ready for thermal printer integration!');
    } catch (error) {
      console.error('Failed to generate receipt:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: 0,
      jersey_name: '',
      jersey_size: '',
      price: 0,
      quantity: 1,
      total_payment: 0,
      payment_method: 'Cash' as PaymentMethod,
      courier_id: null,
      transaction_date: new Date(),
      notes: null
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTransaction(null);
    resetForm();
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

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': 'secondary',
      'in_process': 'default',
      'completed': 'outline',
      'returned': 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-600" />
            🧾 Transaction Management
          </CardTitle>
          <CardDescription>
            Record and manage jersey sales transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by jersey name, customer, or transaction ID..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={limit.toString()} onValueChange={(value: string) => setLimit(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="-1">All</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingTransaction(null);
                    resetForm();
                    setIsDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingTransaction ? 'Update transaction details' : 'Enter transaction information below'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customer">Customer *</Label>
                        <Select 
                          value={formData.customer_id.toString()} 
                          onValueChange={(value: string) =>
                            setFormData((prev: CreateTransactionInput) => ({ ...prev, customer_id: parseInt(value) }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer: Customer) => (
                              <SelectItem key={customer.id} value={customer.id.toString()}>
                                {customer.name} - {customer.phone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="transaction_date">Transaction Date *</Label>
                        <Input
                          id="transaction_date"
                          type="date"
                          value={formData.transaction_date.toISOString().split('T')[0]}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateTransactionInput) => ({ 
                              ...prev, 
                              transaction_date: new Date(e.target.value) 
                            }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="jersey_name">Jersey Name *</Label>
                        <Input
                          id="jersey_name"
                          placeholder="e.g., Manchester United Home 23/24"
                          value={formData.jersey_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateTransactionInput) => ({ ...prev, jersey_name: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="jersey_size">Jersey Size *</Label>
                        <Select 
                          value={formData.jersey_size} 
                          onValueChange={(value: string) =>
                            setFormData((prev: CreateTransactionInput) => ({ ...prev, jersey_size: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="XS">XS</SelectItem>
                            <SelectItem value="S">S</SelectItem>
                            <SelectItem value="M">M</SelectItem>
                            <SelectItem value="L">L</SelectItem>
                            <SelectItem value="XL">XL</SelectItem>
                            <SelectItem value="XXL">XXL</SelectItem>
                            <SelectItem value="XXXL">XXXL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="price">Price (Rp) *</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="1000"
                          value={formData.price}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateTransactionInput) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="quantity">Quantity *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={formData.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateTransactionInput) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="total_payment">Total Payment (Rp)</Label>
                        <Input
                          id="total_payment"
                          type="number"
                          value={formData.total_payment}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateTransactionInput) => ({ ...prev, total_payment: parseFloat(e.target.value) || 0 }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="payment_method">Payment Method *</Label>
                        <Select 
                          value={formData.payment_method} 
                          onValueChange={(value: PaymentMethod) =>
                            setFormData((prev: CreateTransactionInput) => ({ ...prev, payment_method: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">💵 Cash</SelectItem>
                            <SelectItem value="Transfer">🏦 Transfer</SelectItem>
                            <SelectItem value="COD">📦 COD (Cash on Delivery)</SelectItem>
                            <SelectItem value="Shopee">🛒 Shopee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="courier">Courier (Optional)</Label>
                        <Select 
                          value={formData.courier_id?.toString() || ''} 
                          onValueChange={(value: string) =>
                            setFormData((prev: CreateTransactionInput) => ({ 
                              ...prev, 
                              courier_id: value ? parseInt(value) : null 
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select courier (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {couriers.map((courier: Courier) => (
                              <SelectItem key={courier.id} value={courier.id.toString()}>
                                {courier.name} ({courier.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setFormData((prev: CreateTransactionInput) => ({
                            ...prev,
                            notes: e.target.value || null
                          }))
                        }
                        placeholder="Additional notes about this transaction"
                      />
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={handleDialogClose}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : (editingTransaction ? 'Update' : 'Create')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Transactions Table */}
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
                    <TableHead>Customer & Product</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Courier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {/* Display appropriate message for stub mode */}
                        No transactions found. The transaction system is ready for implementation!
                        <br />
                        <small className="text-xs text-gray-400">
                          This is currently showing stub data. Add your first transaction above!
                        </small>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction: TransactionWithRelations) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{transaction.customer.name}</div>
                            <div className="text-sm text-gray-600">{transaction.jersey_name}</div>
                            <div className="text-xs text-gray-500">Size: {transaction.jersey_size}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Qty: {transaction.quantity}</div>
                            <div>@ Rp {transaction.price.toLocaleString('id-ID')}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">Rp {transaction.total_payment.toLocaleString('id-ID')}</div>
                            {getPaymentMethodBadge(transaction.payment_method)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.courier ? (
                            <Badge variant="outline">{transaction.courier.code}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.order_status)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {transaction.transaction_date.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintReceipt(transaction.id)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(transaction)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this transaction? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(transaction.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
            {transactions.length === 0 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-xs text-blue-600">
                  🧾 Transaction system is ready. Add customers and couriers first, then create transactions.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}