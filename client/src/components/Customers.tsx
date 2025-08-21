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
import { Plus, Edit, Trash2, Search, Users } from 'lucide-react';
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '../../../server/src/schema';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    notes: null
  });

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getCustomers.query({
        page,
        limit,
        search: searchTerm || undefined
      });
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
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchTerm]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingCustomer) {
        const updateData: UpdateCustomerInput = {
          id: editingCustomer.id,
          ...formData
        };
        await trpc.updateCustomer.mutate(updateData);
      } else {
        await trpc.createCustomer.mutate(formData);
      }

      setIsDialogOpen(false);
      setEditingCustomer(null);
      resetForm();
      loadCustomers();
    } catch (error) {
      console.error('Failed to save customer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      province: customer.province,
      notes: customer.notes
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteCustomer.mutate({ id });
      loadCustomers();
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      city: '',
      province: '',
      notes: null
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            👥 Customer Management
          </CardTitle>
          <CardDescription>
            Manage customer information and records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search customers by name, phone, or city..."
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
                    setEditingCustomer(null);
                    resetForm();
                    setIsDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCustomer ? 'Update customer information' : 'Enter customer details below'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateCustomerInput) => ({ ...prev, name: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateCustomerInput) => ({ ...prev, phone: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setFormData((prev: CreateCustomerInput) => ({ ...prev, address: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateCustomerInput) => ({ ...prev, city: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="province">Province *</Label>
                        <Input
                          id="province"
                          value={formData.province}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateCustomerInput) => ({ ...prev, province: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setFormData((prev: CreateCustomerInput) => ({
                            ...prev,
                            notes: e.target.value || null
                          }))
                        }
                        placeholder="Optional notes about the customer"
                      />
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={handleDialogClose}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : (editingCustomer ? 'Update' : 'Create')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Customers Table */}
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
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No customers found. Add your first customer!
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer: Customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{customer.city}</div>
                            <div className="text-gray-500">{customer.province}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.notes ? (
                            <Badge variant="outline" className="text-xs">
                              Has notes
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {customer.created_at.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(customer)}
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
                                  <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{customer.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(customer.id)}
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
            Showing {customers.length} customer{customers.length !== 1 ? 's' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
            {customers.length === 0 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-xs text-blue-600">
                  👥 Customer management system is ready. Backend integration will populate real data.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}