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
import { Plus, Edit, Trash2, Search, Truck } from 'lucide-react';
import type { Courier, CreateCourierInput, UpdateCourierInput } from '../../../server/src/schema';

export default function Couriers() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateCourierInput>({
    name: '',
    code: '',
    notes: null
  });

  const loadCouriers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getCouriers.query({
        page,
        limit,
        search: searchTerm || undefined
      });
      // Handle response structure - extract array from response
      if (Array.isArray(result)) {
        setCouriers(result);
      } else if (result && typeof result === 'object' && 'couriers' in result) {
        setCouriers((result as any).couriers);
      } else {
        setCouriers([]);
      }
    } catch (error) {
      console.error('Failed to load couriers:', error);
      setCouriers([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchTerm]);

  useEffect(() => {
    loadCouriers();
  }, [loadCouriers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingCourier) {
        const updateData: UpdateCourierInput = {
          id: editingCourier.id,
          ...formData
        };
        await trpc.updateCourier.mutate(updateData);
      } else {
        await trpc.createCourier.mutate(formData);
      }

      setIsDialogOpen(false);
      setEditingCourier(null);
      resetForm();
      loadCouriers();
    } catch (error) {
      console.error('Failed to save courier:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (courier: Courier) => {
    setEditingCourier(courier);
    setFormData({
      name: courier.name,
      code: courier.code,
      notes: courier.notes
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteCourier.mutate({ id });
      loadCouriers();
    } catch (error) {
      console.error('Failed to delete courier:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      notes: null
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCourier(null);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-green-600" />
            🚛 Courier Management
          </CardTitle>
          <CardDescription>
            Manage courier services and delivery partners
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search couriers by name or code..."
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
                    setEditingCourier(null);
                    resetForm();
                    setIsDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Courier
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCourier ? 'Edit Courier' : 'Add New Courier'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCourier ? 'Update courier information' : 'Enter courier details below'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Courier Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., JNE, JNT, SiCepat"
                        value={formData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateCourierInput) => ({ ...prev, name: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="code">Courier Code *</Label>
                      <Input
                        id="code"
                        placeholder="e.g., JNE, JNT, SICEPAT"
                        value={formData.code}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateCourierInput) => ({ ...prev, code: e.target.value.toUpperCase() }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setFormData((prev: CreateCourierInput) => ({
                            ...prev,
                            notes: e.target.value || null
                          }))
                        }
                        placeholder="Additional information about the courier service"
                      />
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={handleDialogClose}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : (editingCourier ? 'Update' : 'Create')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Couriers Table */}
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
                    <TableHead>Courier Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {couriers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No couriers found. Add your first courier service!
                      </TableCell>
                    </TableRow>
                  ) : (
                    couriers.map((courier: Courier) => (
                      <TableRow key={courier.id}>
                        <TableCell className="font-medium">{courier.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{courier.code}</Badge>
                        </TableCell>
                        <TableCell>
                          {courier.notes ? (
                            <div className="text-sm text-gray-600 max-w-xs truncate">
                              {courier.notes}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {courier.created_at.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(courier)}
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
                                  <AlertDialogTitle>Delete Courier</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{courier.name}"? This action cannot be undone and may affect existing transactions.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(courier.id)}
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
            Showing {couriers.length} courier service{couriers.length !== 1 ? 's' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
            {couriers.length === 0 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-xs text-blue-600">
                  🚛 Courier management system is ready. Backend integration will populate real data.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}