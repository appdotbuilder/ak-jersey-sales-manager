import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingBag, 
  Users, 
  Truck, 
  Receipt, 
  ClipboardList, 
  BarChart3, 
  Settings 
} from 'lucide-react';

import Dashboard from '@/components/Dashboard';
import Customers from '@/components/Customers';
import Couriers from '@/components/Couriers';
import Transactions from '@/components/Transactions';
import Orders from '@/components/Orders';
import Reports from '@/components/Reports';
import SettingsPage from '@/components/Settings';

import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">⚽ AK Jersey</h1>
          <p className="text-lg text-gray-600">Sales Management System</p>
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
            Demo Mode - Frontend Ready for Integration
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="couriers" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Couriers
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Process
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>

          <TabsContent value="customers">
            <Customers />
          </TabsContent>

          <TabsContent value="couriers">
            <Couriers />
          </TabsContent>

          <TabsContent value="transactions">
            <Transactions />
          </TabsContent>

          <TabsContent value="orders">
            <Orders />
          </TabsContent>

          <TabsContent value="reports">
            <Reports />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;