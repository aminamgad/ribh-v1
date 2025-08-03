import { getSystemSettings, clearSettingsCache, validateOrderValue, calculateShippingCost, calculateCommission, validateWithdrawalAmount, calculateWithdrawalFees } from './settings';

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
}

// Export a singleton instance
export const settingsManager = new SettingsManager(); 