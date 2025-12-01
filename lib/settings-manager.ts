import { getSystemSettings, clearSettingsCache, validateOrderValue, calculateShippingCost, calculateCommission, validateWithdrawalAmount, calculateWithdrawalFees, getAdminProfitMargin, calculateAdminProfitForProduct, calculateAdminProfitForOrder } from './settings';

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

  async calculateShipping(orderTotal: number) {
    return await calculateShippingCost(orderTotal);
  }

  async calculateCommission(orderTotal: number) {
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
}

// Export a singleton instance
export const settingsManager = new SettingsManager(); 