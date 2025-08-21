import { db } from '../db';
import { shopSettingsTable, customersTable, transactionsTable, couriersTable } from '../db/schema';
import { type ShopSettings, type UpdateShopSettingsInput } from '../schema';
import { eq } from 'drizzle-orm';

const DEFAULT_RECEIPT_TEMPLATE = `
{{shop_name}}
{{shop_address}}
{{shop_phone}}
================================
Order #{{order_id}}
Date: {{transaction_date}}
--------------------------------
Customer: {{customer_name}}
Phone: {{customer_phone}}
--------------------------------
{{jersey_name}} - {{jersey_size}}
Qty: {{quantity}} x {{price}}
Total: {{total_payment}}
Payment: {{payment_method}}
{{#courier}}Courier: {{courier_name}}{{/courier}}
================================
Thank you for your order!
`.trim();

export async function getShopSettings(): Promise<ShopSettings> {
  try {
    const settings = await db.select()
      .from(shopSettingsTable)
      .limit(1)
      .execute();

    if (settings.length === 0) {
      // Initialize default settings if none exist
      return await initializeDefaultSettings();
    }

    return settings[0];
  } catch (error) {
    console.error('Failed to get shop settings:', error);
    throw error;
  }
}

export async function updateShopSettings(input: UpdateShopSettingsInput): Promise<ShopSettings> {
  try {
    // First, try to get existing settings
    const existingSettings = await db.select()
      .from(shopSettingsTable)
      .limit(1)
      .execute();

    if (existingSettings.length === 0) {
      // Create new settings if none exist
      const result = await db.insert(shopSettingsTable)
        .values({
          shop_name: input.shop_name || 'AK Jersey',
          shop_address: input.shop_address || '',
          shop_phone: input.shop_phone || '',
          receipt_template: input.receipt_template || DEFAULT_RECEIPT_TEMPLATE,
          updated_at: new Date()
        })
        .returning()
        .execute();

      return result[0];
    } else {
      // Update existing settings
      const result = await db.update(shopSettingsTable)
        .set({
          ...(input.shop_name !== undefined && { shop_name: input.shop_name }),
          ...(input.shop_address !== undefined && { shop_address: input.shop_address }),
          ...(input.shop_phone !== undefined && { shop_phone: input.shop_phone }),
          ...(input.receipt_template !== undefined && { receipt_template: input.receipt_template }),
          updated_at: new Date()
        })
        .where(eq(shopSettingsTable.id, existingSettings[0].id))
        .returning()
        .execute();

      return result[0];
    }
  } catch (error) {
    console.error('Failed to update shop settings:', error);
    throw error;
  }
}

export async function getReceiptTemplate(): Promise<string> {
  try {
    const settings = await getShopSettings();
    return settings.receipt_template;
  } catch (error) {
    console.error('Failed to get receipt template:', error);
    throw error;
  }
}

export async function updateReceiptTemplate(template: string): Promise<ShopSettings> {
  try {
    return await updateShopSettings({ receipt_template: template });
  } catch (error) {
    console.error('Failed to update receipt template:', error);
    throw error;
  }
}

export async function initializeDefaultSettings(): Promise<ShopSettings> {
  try {
    const result = await db.insert(shopSettingsTable)
      .values({
        shop_name: 'AK Jersey',
        shop_address: '',
        shop_phone: '',
        receipt_template: DEFAULT_RECEIPT_TEMPLATE
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Failed to initialize default settings:', error);
    throw error;
  }
}

// Placeholder implementations for Excel export functions
export async function exportCustomersToExcel(): Promise<Buffer> {
  // This would require additional dependencies like exceljs
  // For now, return empty buffer as placeholder
  console.warn('Excel export not implemented - requires additional dependencies');
  return Buffer.from('');
}

export async function exportOrdersToExcel(): Promise<Buffer> {
  // This would require additional dependencies like exceljs
  // For now, return empty buffer as placeholder
  console.warn('Excel export not implemented - requires additional dependencies');
  return Buffer.from('');
}