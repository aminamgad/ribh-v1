import { getSystemSettings, clearSettingsCache, validateOrderValue, calculateShippingCost, calculateCommission, validateWithdrawalAmount, calculateWithdrawalFees, getAdminProfitMargin, calculateAdminProfitForProduct, calculateAdminProfitForOrder } from './settings';
import { logger } from './logger';

// Settings Manager class to provide a consistent interface
class SettingsManager {
  async getSettings() {
    return await getSystemSettings();
  }

  async getAllSettings() {
    return await getSystemSettings();
  }

  async updateSettings(newSettings: any) {
    // This would be implemented to update settings in the database
    // For now, we'll clear the cache so next getSettings() call fetches fresh data
    clearSettingsCache();
    return await getSystemSettings();
  }

  clearCache() {
    clearSettingsCache();
  }

  async validateOrder(orderTotal: number) {
    return await validateOrderValue(orderTotal);
  }

  async calculateShipping(orderTotal: number, villageId?: number) {
    return await calculateShippingCost(orderTotal, villageId);
  }
  
  // Legacy method for backward compatibility
  async calculateShippingLegacy(orderTotal: number, governorateName?: string) {
    const { calculateShippingCostLegacy } = await import('./settings');
    return await calculateShippingCostLegacy(orderTotal, governorateName);
  }

  // Deprecated: calculateCommission - use calculateAdminProfitForOrder instead
  async calculateCommission(orderTotal: number) {
    logger.warn('calculateCommission is deprecated - use calculateAdminProfitForOrder instead', { orderTotal });
    return await calculateCommission(orderTotal);
  }

  async validateWithdrawal(amount: number) {
    return await validateWithdrawalAmount(amount);
  }

  async calculateWithdrawalFees(amount: number) {
    return await calculateWithdrawalFees(amount);
  }

  async getAdminProfitMargin(productPrice: number) {
    return await getAdminProfitMargin(productPrice);
  }

  async calculateAdminProfitForProduct(productPrice: number, quantity: number = 1) {
    return await calculateAdminProfitForProduct(productPrice, quantity);
  }

  async calculateAdminProfitForOrder(items: Array<{ unitPrice: number; quantity: number }>) {
    return await calculateAdminProfitForOrder(items);
  }

  async calculateMarketerPriceFromSupplierPrice(supplierPrice: number) {
    const { calculateMarketerPriceFromSupplierPrice } = await import('./settings');
    return await calculateMarketerPriceFromSupplierPrice(supplierPrice);
  }

  async calculateSupplierPriceFromMarketerPrice(marketerPrice: number) {
    const { calculateSupplierPriceFromMarketerPrice } = await import('./settings');
    return await calculateSupplierPriceFromMarketerPrice(marketerPrice);
  }
}

// Export a singleton instance
export const settingsManager = new SettingsManager(); 