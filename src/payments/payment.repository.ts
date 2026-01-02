import { Injectable } from '@nestjs/common';
import { eq, desc, and, gte, lte, like, or, sql, SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { payments, Payment, NewPayment, PaymentStatus, carts, paymentStatusEnum } from '../database/schemas';
import { PaymentFiltersDto } from './dto/payment-filters.dto';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class PaymentRepository {
  constructor(private databaseService: DatabaseService) {}

  async create(data: NewPayment): Promise<Payment> {
    const [payment] = await this.databaseService.db
      .insert(payments)
      .values(data)
      .returning();
    return payment;
  }

  async findById(id: string): Promise<Payment | undefined> {
    const [payment] = await this.databaseService.db
      .select()
      .from(payments)
      .where(eq(payments.id, id));
    return payment;
  }

  async findByCartId(cartId: string): Promise<Payment[]> {
    return await this.databaseService.db
      .select()
      .from(payments)
      .where(eq(payments.cartId, cartId))
      .orderBy(desc(payments.createdAt));
  }

  async findByTransactionId(transactionId: string): Promise<Payment | undefined> {
    const [payment] = await this.databaseService.db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, transactionId));
    return payment;
  }

  async findByStatus(status: PaymentStatus): Promise<Payment[]> {
    return await this.databaseService.db
      .select()
      .from(payments)
      .where(eq(payments.status, status))
      .orderBy(desc(payments.createdAt));
  }

  async findByOrganizationId(organizationId: number): Promise<Payment[]> {
    return await this.databaseService.db
      .select()
      .from(payments)
      .where(eq(payments.organizationId, organizationId))
      .orderBy(desc(payments.createdAt));
  }

  async findAll(): Promise<Payment[]> {
    return await this.databaseService.db
      .select()
      .from(payments)
      .orderBy(desc(payments.createdAt));
  }

  async findAllPaginated(
    filters: PaymentFiltersDto,
  ): Promise<PaginatedResult<Payment>> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: SQL[] = [];

    if (filters.status) {
      conditions.push(eq(payments.status, filters.status));
    }

    if (filters.paymentType) {
      conditions.push(eq(payments.paymentType, filters.paymentType));
    }

    if (filters.cartId) {
      conditions.push(eq(payments.cartId, filters.cartId));
    }

    if (filters.organizationId) {
      conditions.push(eq(payments.organizationId, filters.organizationId));
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      conditions.push(gte(payments.createdAt, startDate));
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      conditions.push(lte(payments.createdAt, endDate));
    }

    if (filters.minAmount !== undefined) {
      // Convert amount string to numeric for comparison
      conditions.push(
        sql`CAST(${payments.amount} AS DECIMAL) >= ${filters.minAmount}`,
      );
    }

    if (filters.maxAmount !== undefined) {
      conditions.push(
        sql`CAST(${payments.amount} AS DECIMAL) <= ${filters.maxAmount}`,
      );
    }

    if (filters.search) {
      // Search in ID (partial match) - convert UUID to text for LIKE search
      conditions.push(sql`CAST(${payments.id} AS TEXT) LIKE ${`%${filters.search}%`}`);
    }

    // If filtering by quotationId, we need to join with carts table
    if (filters.quotationId) {
      conditions.push(eq(carts.conversationId, filters.quotationId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine if we need to join with carts table
    const needsCartJoin = !!filters.quotationId;

    if (needsCartJoin) {
      // Get total count with join
      const [countResult] = await this.databaseService.db
        .select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .innerJoin(carts, eq(payments.cartId, carts.id))
        .where(whereClause);

      const total = countResult?.count || 0;
      const totalPages = Math.ceil(total / limit);

      // Get paginated data with join
      const results = await this.databaseService.db
        .select({
          id: payments.id,
          cartId: payments.cartId,
          organizationId: payments.organizationId,
          amount: payments.amount,
          status: payments.status,
          paymentType: payments.paymentType,
          proofUrl: payments.proofUrl,
          transactionId: payments.transactionId,
          authorizationCode: payments.authorizationCode,
          cardLastFourDigits: payments.cardLastFourDigits,
          externalReference: payments.externalReference,
          paymentDate: payments.paymentDate,
          confirmedAt: payments.confirmedAt,
          metadata: payments.metadata,
          notes: payments.notes,
          createdAt: payments.createdAt,
          updatedAt: payments.updatedAt,
        })
        .from(payments)
        .innerJoin(carts, eq(payments.cartId, carts.id))
        .where(whereClause)
        .orderBy(desc(payments.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data: results as Payment[],
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } else {
      // Get total count without join
      const [countResult] = await this.databaseService.db
        .select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .where(whereClause);

      const total = countResult?.count || 0;
      const totalPages = Math.ceil(total / limit);

      // Get paginated data without join
      const data = await this.databaseService.db
        .select()
        .from(payments)
        .where(whereClause)
        .orderBy(desc(payments.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    }
  }

  async update(
    id: string,
    data: Partial<NewPayment>,
  ): Promise<Payment | undefined> {
    const [payment] = await this.databaseService.db
      .update(payments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
  ): Promise<Payment | undefined> {
    const updateData: Partial<NewPayment> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'completed') {
      updateData.confirmedAt = new Date();
      updateData.paymentDate = new Date();
    }

    const [payment] = await this.databaseService.db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  async uploadProof(
    id: string,
    proofUrl: string,
    notes?: string,
  ): Promise<Payment | undefined> {
    const updateData: Partial<NewPayment> = {
      proofUrl,
      updatedAt: new Date(),
    };

    if (notes) {
      updateData.notes = notes;
    }

    const [payment] = await this.databaseService.db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.databaseService.db
      .delete(payments)
      .where(eq(payments.id, id))
      .returning();
    return result.length > 0;
  }

  async getGlobalStats(): Promise<Array<{
    status: string;
    quantity: number;
    amount: number;
  }>> {
    const allPayments = await this.databaseService.db
      .select()
      .from(payments);

    // Group by status
    const statsMap = new Map<string, { quantity: number; amount: number }>();
    
    // Initialize all possible statuses from enum
    paymentStatusEnum.enumValues.forEach(status => {
      statsMap.set(status, { quantity: 0, amount: 0 });
    });

    // Aggregate data
    allPayments.forEach(payment => {
      const amount = parseFloat(payment.amount);
      const current = statsMap.get(payment.status) || { quantity: 0, amount: 0 };
      
      statsMap.set(payment.status, {
        quantity: current.quantity + 1,
        amount: current.amount + amount,
      });
    });

    // Convert map to array
    const stats = Array.from(statsMap.entries()).map(([status, data]) => ({
      status,
      quantity: data.quantity,
      amount: data.amount,
    }));

    return stats;
  }

  async getPaymentStats(cartId: string): Promise<{
    totalPaid: number;
    totalPending: number;
    totalFailed: number;
    count: number;
  }> {
    const cartPayments = await this.findByCartId(cartId);

    const stats = cartPayments.reduce(
      (acc, payment) => {
        const amount = parseFloat(payment.amount);
        acc.count++;

        if (payment.status === 'completed') {
          acc.totalPaid += amount;
        } else if (payment.status === 'pending' || payment.status === 'waiting_for_confirmation') {
          acc.totalPending += amount;
        } else if (payment.status === 'failed') {
          acc.totalFailed += amount;
        }

        return acc;
      },
      { totalPaid: 0, totalPending: 0, totalFailed: 0, count: 0 },
    );

    return stats;
  }
}

