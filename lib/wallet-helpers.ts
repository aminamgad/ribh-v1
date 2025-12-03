import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { logger } from './logger';
import { sendNotificationToUser } from './notifications';

/**
 * Helper function to add marketer profit to wallet
 */
export async function addMarketerProfit(
  userId: string,
  profit: number,
  orderId: string,
  orderNumber: string
): Promise<void> {
  try {
    if (profit <= 0) {
      logger.debug('No marketer profit to add', { userId, orderNumber });
      return;
    }

    logger.business('Adding marketer profit to wallet', {
      userId,
      profit,
      orderId,
      orderNumber
    });

    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      logger.debug('Creating new wallet for user', { userId });
      wallet = await Wallet.create({
        userId,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        pendingWithdrawals: 0,
        minimumWithdrawal: 100
      });
    }
    
    // Use addTransaction to maintain consistency
    await wallet.addTransaction(
      'credit',
      profit,
      `ربح من الطلب رقم ${orderNumber}`,
      `order_profit_${orderId}`,
      {
        orderId,
        orderNumber,
        type: 'marketer_profit',
        source: 'order_completion'
      }
    );

    logger.business('Marketer profit added successfully', {
      userId,
      profit,
      newBalance: wallet.balance,
      orderNumber
    });

    // Send notification to marketer
    try {
      await sendNotificationToUser(
        userId,
        {
          title: 'تم إضافة ربح جديد',
          message: `تم إضافة ربح بقيمة ${profit}₪ من الطلب رقم ${orderNumber} إلى محفظتك`,
          type: 'success',
          actionUrl: '/dashboard/wallet',
          metadata: {
            orderId,
            orderNumber,
            profit,
            type: 'marketer_profit'
          }
        }
      );
    } catch (notifError) {
      logger.warn('Failed to send notification for marketer profit', {
        error: notifError,
        userId,
        orderNumber
      });
      // Don't throw - notification failure shouldn't break profit distribution
    }
  } catch (error) {
    logger.error('Error adding marketer profit to wallet', error, { userId, orderId, orderNumber });
    throw error;
  }
}

/**
 * Helper function to add admin profit (commission) to wallet
 */
export async function addAdminProfit(
  profit: number,
  orderId: string,
  orderNumber: string
): Promise<void> {
  try {
    if (profit <= 0) {
      logger.debug('No admin commission to add', { orderNumber });
      return;
    }

    logger.business('Adding admin commission to wallet', {
      profit,
      orderId,
      orderNumber
    });

    // Find admin user (first admin found)
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      logger.warn('Admin user not found for profit distribution', { orderId, orderNumber });
      return;
    }

    logger.debug('Admin user found', { adminId: adminUser._id, adminName: adminUser.name });

    let wallet = await Wallet.findOne({ userId: adminUser._id });
    
    if (!wallet) {
      logger.debug('Creating new wallet for admin', { adminId: adminUser._id });
      wallet = await Wallet.create({
        userId: adminUser._id,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        pendingWithdrawals: 0,
        minimumWithdrawal: 100
      });
    }
    
    // Use addTransaction to maintain consistency
    await wallet.addTransaction(
      'credit',
      profit,
      `ربح إداري من الطلب رقم ${orderNumber}`,
      `admin_profit_${orderId}`,
      {
        orderId,
        orderNumber,
        type: 'admin_profit',
        source: 'order_completion'
      }
    );

    logger.business('Admin commission added successfully', {
      adminId: adminUser._id,
      profit,
      newBalance: wallet.balance,
      orderNumber
    });

    // Send notification to admin
    try {
      await sendNotificationToUser(
        adminUser._id.toString(),
        {
          title: 'تم إضافة عمولة إدارية',
          message: `تم إضافة عمولة بقيمة ${profit}₪ من الطلب رقم ${orderNumber}`,
          type: 'success',
          actionUrl: '/dashboard/admin/earnings',
          metadata: {
            orderId,
            orderNumber,
            profit,
            type: 'admin_profit'
          }
        }
      );
    } catch (notifError) {
      logger.warn('Failed to send notification for admin profit', {
        error: notifError,
        adminId: adminUser._id,
        orderNumber
      });
      // Don't throw - notification failure shouldn't break profit distribution
    }
  } catch (error) {
    logger.error('Error adding admin commission to wallet', error, { orderId, orderNumber });
    throw error;
  }
}

/**
 * Helper function to distribute profits for a delivered order
 * This function handles both marketer and admin profits
 * Includes rollback mechanism in case of failure
 */
export async function distributeOrderProfits(order: any): Promise<void> {
  const orderId = order._id?.toString();
  const orderNumber = order.orderNumber;
  
  // Track what was distributed for potential rollback
  const distributedAmounts: { userId?: string; amount: number; type: 'marketer' | 'admin' }[] = [];
  
  try {
    // Check if profits already distributed
    if (order.profitsDistributed) {
      logger.warn('Profits already distributed for this order', {
        orderId,
        orderNumber,
        distributedAt: order.profitsDistributedAt
      });
      return;
    }

    // Check if order is delivered
    if (order.status !== 'delivered') {
      logger.warn('Cannot distribute profits for non-delivered order', {
        orderId,
        orderNumber,
        status: order.status
      });
      return;
    }

    logger.business('Starting profit distribution', {
      orderId,
      orderNumber,
      marketerProfit: order.marketerProfit || 0,
      adminCommission: order.commission || 0,
      customerRole: order.customerRole
    });

    // Add marketer profit if applicable
    if (order.marketerProfit > 0 && order.customerRole === 'marketer') {
      const customerId = order.customerId?._id || order.customerId;
      try {
        await addMarketerProfit(
          customerId.toString(),
          order.marketerProfit,
          orderId,
          orderNumber
        );
        distributedAmounts.push({
          userId: customerId.toString(),
          amount: order.marketerProfit,
          type: 'marketer'
        });
      } catch (error) {
        logger.error('Error adding marketer profit, rolling back', error, {
          orderId,
          orderNumber
        });
        // Rollback any previous distributions
        await rollbackProfitDistribution(distributedAmounts, orderId, orderNumber);
        throw error;
      }
    }

    // Add admin profit (commission)
    if (order.commission > 0) {
      try {
        await addAdminProfit(
          order.commission,
          orderId,
          orderNumber
        );
        distributedAmounts.push({
          amount: order.commission,
          type: 'admin'
        });
      } catch (error) {
        logger.error('Error adding admin profit, rolling back', error, {
          orderId,
          orderNumber
        });
        // Rollback any previous distributions
        await rollbackProfitDistribution(distributedAmounts, orderId, orderNumber);
        throw error;
      }
    }

    // Mark profits as distributed only after all distributions succeed
    order.profitsDistributed = true;
    order.profitsDistributedAt = new Date();
    await order.save();

    logger.business('Profits distributed successfully', {
      orderId,
      orderNumber,
      marketerProfit: order.marketerProfit || 0,
      adminCommission: order.commission || 0,
      customerRole: order.customerRole
    });
  } catch (error) {
    logger.error('Error distributing order profits', error, {
      orderId,
      orderNumber
    });
    // Ensure order is not marked as distributed if there was an error
    if (order.profitsDistributed) {
      order.profitsDistributed = false;
      order.profitsDistributedAt = undefined;
      await order.save();
    }
    throw error;
  }
}

/**
 * Rollback profit distribution in case of failure
 */
async function rollbackProfitDistribution(
  distributedAmounts: { userId?: string; amount: number; type: 'marketer' | 'admin' }[],
  orderId: string,
  orderNumber: string
): Promise<void> {
  logger.business('Rolling back profit distribution', {
    orderId,
    orderNumber,
    distributedCount: distributedAmounts.length
  });

  for (const distributed of distributedAmounts) {
    try {
      if (distributed.type === 'marketer' && distributed.userId) {
        const wallet = await Wallet.findOne({ userId: distributed.userId });
        if (wallet) {
          await wallet.addTransaction(
            'debit',
            distributed.amount,
            `استرداد ربح من الطلب رقم ${orderNumber} (خطأ في التوزيع)`,
            `order_profit_rollback_${orderId}`,
            {
              orderId,
              orderNumber,
              type: 'marketer_profit_rollback',
              source: 'distribution_error'
            }
          );
        }
      } else if (distributed.type === 'admin') {
        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) {
          const wallet = await Wallet.findOne({ userId: adminUser._id });
          if (wallet) {
            await wallet.addTransaction(
              'debit',
              distributed.amount,
              `استرداد ربح إداري من الطلب رقم ${orderNumber} (خطأ في التوزيع)`,
              `admin_profit_rollback_${orderId}`,
              {
                orderId,
                orderNumber,
                type: 'admin_profit_rollback',
                source: 'distribution_error'
              }
            );
          }
        }
      }
    } catch (rollbackError) {
      logger.error('Error during profit rollback', rollbackError, {
        orderId,
        orderNumber,
        distributed
      });
      // Continue with other rollbacks even if one fails
    }
  }
}

/**
 * Helper function to reverse profits for cancelled/returned orders
 */
export async function reverseOrderProfits(order: any): Promise<void> {
  try {
    // Only reverse if profits were already distributed
    if (!order.profitsDistributed) {
      logger.debug('No profits to reverse - profits not distributed', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber
      });
      return;
    }

    logger.business('Starting profit reversal', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      marketerProfit: order.marketerProfit || 0,
      adminCommission: order.commission || 0
    });

    const reversalPromises: Promise<void>[] = [];

    // Reverse marketer profit if applicable
    if (order.marketerProfit > 0 && order.customerRole === 'marketer') {
      const customerId = order.customerId?._id || order.customerId;
      reversalPromises.push(
        reverseMarketerProfit(
          customerId.toString(),
          order.marketerProfit,
          order._id.toString(),
          order.orderNumber
        )
      );
    }

    // Reverse admin profit (commission)
    if (order.commission > 0) {
      reversalPromises.push(
        reverseAdminProfit(
          order.commission,
          order._id.toString(),
          order.orderNumber
        )
      );
    }

    // Execute all reversals
    await Promise.all(reversalPromises);

    // Mark profits as not distributed
    order.profitsDistributed = false;
    order.profitsDistributedAt = undefined;
    await order.save();

    logger.business('Profits reversed successfully', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber
    });
  } catch (error) {
    logger.error('Error reversing order profits', error, {
      orderId: order._id?.toString(),
      orderNumber: order.orderNumber
    });
    throw error;
  }
}

/**
 * Helper function to reverse marketer profit
 */
async function reverseMarketerProfit(
  userId: string,
  profit: number,
  orderId: string,
  orderNumber: string
): Promise<void> {
  try {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      logger.warn('Wallet not found for profit reversal', { userId, orderNumber });
      return;
    }

    // Check if user has sufficient balance
    if (wallet.balance < profit) {
      logger.warn('Insufficient balance for profit reversal', {
        userId,
        balance: wallet.balance,
        profit,
        orderNumber
      });
      // Still reverse but log warning
    }

    await wallet.addTransaction(
      'debit',
      profit,
      `استرداد ربح من الطلب رقم ${orderNumber} (ملغي/مرتجع)`,
      `order_profit_reversal_${orderId}`,
      {
        orderId,
        orderNumber,
        type: 'marketer_profit_reversal',
        source: 'order_cancellation_return'
      }
    );

    logger.business('Marketer profit reversed successfully', {
      userId,
      profit,
      newBalance: wallet.balance,
      orderNumber
    });
  } catch (error) {
    logger.error('Error reversing marketer profit', error, { userId, orderId, orderNumber });
    throw error;
  }
}

/**
 * Helper function to reverse admin profit
 */
async function reverseAdminProfit(
  profit: number,
  orderId: string,
  orderNumber: string
): Promise<void> {
  try {
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      logger.warn('Admin user not found for profit reversal', { orderId, orderNumber });
      return;
    }

    const wallet = await Wallet.findOne({ userId: adminUser._id });
    if (!wallet) {
      logger.warn('Admin wallet not found for profit reversal', { orderId, orderNumber });
      return;
    }

    // Check if admin has sufficient balance
    if (wallet.balance < profit) {
      logger.warn('Insufficient admin balance for profit reversal', {
        balance: wallet.balance,
        profit,
        orderNumber
      });
      // Still reverse but log warning
    }

    await wallet.addTransaction(
      'debit',
      profit,
      `استرداد ربح إداري من الطلب رقم ${orderNumber} (ملغي/مرتجع)`,
      `admin_profit_reversal_${orderId}`,
      {
        orderId,
        orderNumber,
        type: 'admin_profit_reversal',
        source: 'order_cancellation_return'
      }
    );

    logger.business('Admin profit reversed successfully', {
      adminId: adminUser._id,
      profit,
      newBalance: wallet.balance,
      orderNumber
    });
  } catch (error) {
    logger.error('Error reversing admin profit', error, { orderId, orderNumber });
    throw error;
  }
}

