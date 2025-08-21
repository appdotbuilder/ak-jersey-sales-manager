import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { shopSettingsTable } from '../db/schema';
import { type UpdateShopSettingsInput } from '../schema';
import { 
  getShopSettings, 
  updateShopSettings, 
  getReceiptTemplate, 
  updateReceiptTemplate, 
  initializeDefaultSettings 
} from '../handlers/settings';
import { eq } from 'drizzle-orm';

const testUpdateInput: UpdateShopSettingsInput = {
  shop_name: 'Test Jersey Shop',
  shop_address: '123 Test Street, Test City',
  shop_phone: '+62123456789',
  receipt_template: 'Test receipt template'
};

describe('Settings Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('initializeDefaultSettings', () => {
    it('should create default settings', async () => {
      const result = await initializeDefaultSettings();

      expect(result.id).toBeDefined();
      expect(result.shop_name).toBe('AK Jersey');
      expect(result.shop_address).toBe('');
      expect(result.shop_phone).toBe('');
      expect(result.receipt_template).toContain('{{shop_name}}');
      expect(result.receipt_template).toContain('Thank you for your order!');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save settings to database', async () => {
      const result = await initializeDefaultSettings();

      const settings = await db.select()
        .from(shopSettingsTable)
        .where(eq(shopSettingsTable.id, result.id))
        .execute();

      expect(settings).toHaveLength(1);
      expect(settings[0].shop_name).toBe('AK Jersey');
      expect(settings[0].receipt_template).toContain('{{shop_name}}');
    });
  });

  describe('getShopSettings', () => {
    it('should return existing settings', async () => {
      // Create initial settings
      await initializeDefaultSettings();

      const result = await getShopSettings();

      expect(result.shop_name).toBe('AK Jersey');
      expect(result.shop_address).toBe('');
      expect(result.shop_phone).toBe('');
      expect(result.receipt_template).toContain('{{shop_name}}');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should initialize default settings if none exist', async () => {
      const result = await getShopSettings();

      expect(result.shop_name).toBe('AK Jersey');
      expect(result.receipt_template).toContain('Thank you for your order!');

      // Verify settings were created in database
      const settings = await db.select()
        .from(shopSettingsTable)
        .execute();

      expect(settings).toHaveLength(1);
    });
  });

  describe('updateShopSettings', () => {
    it('should update existing settings', async () => {
      // Create initial settings
      await initializeDefaultSettings();

      const result = await updateShopSettings(testUpdateInput);

      expect(result.shop_name).toBe('Test Jersey Shop');
      expect(result.shop_address).toBe('123 Test Street, Test City');
      expect(result.shop_phone).toBe('+62123456789');
      expect(result.receipt_template).toBe('Test receipt template');
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create settings if none exist', async () => {
      const result = await updateShopSettings(testUpdateInput);

      expect(result.shop_name).toBe('Test Jersey Shop');
      expect(result.shop_address).toBe('123 Test Street, Test City');
      expect(result.shop_phone).toBe('+62123456789');
      expect(result.receipt_template).toBe('Test receipt template');
    });

    it('should update only provided fields', async () => {
      // Create initial settings
      const initial = await initializeDefaultSettings();

      const partialUpdate = {
        shop_name: 'Updated Name Only'
      };

      const result = await updateShopSettings(partialUpdate);

      expect(result.shop_name).toBe('Updated Name Only');
      expect(result.shop_address).toBe(initial.shop_address); // Should remain unchanged
      expect(result.shop_phone).toBe(initial.shop_phone); // Should remain unchanged
      expect(result.receipt_template).toBe(initial.receipt_template); // Should remain unchanged
    });

    it('should update the updated_at timestamp', async () => {
      const initial = await initializeDefaultSettings();
      
      // Wait a moment to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await updateShopSettings({ shop_name: 'Updated' });

      expect(result.updated_at.getTime()).toBeGreaterThan(initial.updated_at.getTime());
    });

    it('should save updated settings to database', async () => {
      await initializeDefaultSettings();
      const result = await updateShopSettings(testUpdateInput);

      const settings = await db.select()
        .from(shopSettingsTable)
        .where(eq(shopSettingsTable.id, result.id))
        .execute();

      expect(settings).toHaveLength(1);
      expect(settings[0].shop_name).toBe('Test Jersey Shop');
      expect(settings[0].shop_address).toBe('123 Test Street, Test City');
      expect(settings[0].shop_phone).toBe('+62123456789');
      expect(settings[0].receipt_template).toBe('Test receipt template');
    });
  });

  describe('getReceiptTemplate', () => {
    it('should return receipt template from settings', async () => {
      await initializeDefaultSettings();

      const template = await getReceiptTemplate();

      expect(template).toContain('{{shop_name}}');
      expect(template).toContain('{{customer_name}}');
      expect(template).toContain('{{total_payment}}');
      expect(template).toContain('Thank you for your order!');
    });

    it('should return custom template after update', async () => {
      await initializeDefaultSettings();
      const customTemplate = 'Custom receipt template with {{order_id}}';
      
      await updateShopSettings({ receipt_template: customTemplate });
      const template = await getReceiptTemplate();

      expect(template).toBe(customTemplate);
    });
  });

  describe('updateReceiptTemplate', () => {
    it('should update only receipt template', async () => {
      const initial = await initializeDefaultSettings();
      const newTemplate = 'New template with {{customer_name}}';

      const result = await updateReceiptTemplate(newTemplate);

      expect(result.receipt_template).toBe(newTemplate);
      expect(result.shop_name).toBe(initial.shop_name); // Should remain unchanged
      expect(result.shop_address).toBe(initial.shop_address); // Should remain unchanged
      expect(result.shop_phone).toBe(initial.shop_phone); // Should remain unchanged
    });

    it('should save updated template to database', async () => {
      await initializeDefaultSettings();
      const newTemplate = 'Updated template';

      const result = await updateReceiptTemplate(newTemplate);

      const settings = await db.select()
        .from(shopSettingsTable)
        .where(eq(shopSettingsTable.id, result.id))
        .execute();

      expect(settings).toHaveLength(1);
      expect(settings[0].receipt_template).toBe(newTemplate);
    });

    it('should create settings with template if none exist', async () => {
      const newTemplate = 'Brand new template';

      const result = await updateReceiptTemplate(newTemplate);

      expect(result.receipt_template).toBe(newTemplate);
      expect(result.shop_name).toBe('AK Jersey'); // Default value
    });
  });

  describe('multiple operations', () => {
    it('should handle sequential updates correctly', async () => {
      // Initialize
      const initial = await initializeDefaultSettings();
      expect(initial.shop_name).toBe('AK Jersey');

      // First update
      const firstUpdate = await updateShopSettings({ 
        shop_name: 'First Update',
        shop_address: 'Address 1'
      });
      expect(firstUpdate.shop_name).toBe('First Update');
      expect(firstUpdate.shop_address).toBe('Address 1');

      // Second update
      const secondUpdate = await updateShopSettings({ 
        shop_name: 'Second Update',
        shop_phone: '123456'
      });
      expect(secondUpdate.shop_name).toBe('Second Update');
      expect(secondUpdate.shop_address).toBe('Address 1'); // Should persist
      expect(secondUpdate.shop_phone).toBe('123456');

      // Verify final state in database
      const finalSettings = await getShopSettings();
      expect(finalSettings.shop_name).toBe('Second Update');
      expect(finalSettings.shop_address).toBe('Address 1');
      expect(finalSettings.shop_phone).toBe('123456');
    });
  });
});