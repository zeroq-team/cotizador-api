import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  customers,
  type Customer,
  type NewCustomer,
} from '../database/schemas';

@Injectable()
export class CustomerRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findById(id: string): Promise<Customer | null> {
    const result = await this.databaseService.db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    return result[0] || null;
  }

  async findByOrganizationAndDocument(
    organizationId: number,
    documentType: string,
    documentNumber: string,
  ): Promise<Customer | null> {
    const result = await this.databaseService.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          eq(customers.documentType, documentType),
          eq(customers.documentNumber, documentNumber),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  async findByPhone(
    organizationId: number,
    phoneCode: string,
    phoneNumber: string,
  ): Promise<Customer | null> {
    if (!phoneCode || !phoneNumber) {
      return null;
    }

    const result = await this.databaseService.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          eq(customers.phoneCode, phoneCode),
          eq(customers.phoneNumber, phoneNumber),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  async create(data: NewCustomer): Promise<Customer> {
    // Convert undefined to null for optional fields to avoid SQL issues
    const cleanData: NewCustomer = {
      organizationId: data.organizationId,
      fullName: data.fullName ?? null,
      documentType: data.documentType ?? null,
      documentNumber: data.documentNumber ?? null,
      email: data.email ?? null,
      phoneCode: data.phoneCode ?? null,
      phoneNumber: data.phoneNumber ?? null,
    };

    try {
      const result = await this.databaseService.db
        .insert(customers)
        .values(cleanData)
        .returning();

      return result[0];
    } catch (error: any) {
      // Log the full error for debugging
      console.error('Error creating customer:', {
        error: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        table: error.table,
        data: cleanData,
      });
      
      // Re-throw with more context
      throw new Error(
        `Failed to create customer: ${error.message || error}. ` +
        `Detail: ${error.detail || 'No additional details'}. ` +
        `Constraint: ${error.constraint || 'N/A'}`
      );
    }
  }

  async update(id: string, data: Partial<NewCustomer>): Promise<Customer | null> {
    // Convert undefined to null for optional fields
    const cleanData: Partial<NewCustomer> = {};
    if (data.organizationId !== undefined) cleanData.organizationId = data.organizationId;
    if (data.fullName !== undefined) cleanData.fullName = data.fullName ?? null;
    if (data.documentType !== undefined) cleanData.documentType = data.documentType ?? null;
    if (data.documentNumber !== undefined) cleanData.documentNumber = data.documentNumber ?? null;
    if (data.email !== undefined) cleanData.email = data.email ?? null;
    if (data.phoneCode !== undefined) cleanData.phoneCode = data.phoneCode ?? null;
    if (data.phoneNumber !== undefined) cleanData.phoneNumber = data.phoneNumber ?? null;

    const result = await this.databaseService.db
      .update(customers)
      .set({
        ...cleanData,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    return result[0] || null;
  }

  async upsert(
    organizationId: number,
    customerData: {
      fullName?: string;
      documentType?: string;
      documentNumber?: string;
      email?: string;
      phoneCode?: string;
      phoneNumber?: string;
    },
  ): Promise<Customer> {
    // Priority 1: Try to find existing customer by phone (primary identifier)
    if (customerData.phoneCode && customerData.phoneNumber) {
      const existingByPhone = await this.findByPhone(
        organizationId,
        customerData.phoneCode,
        customerData.phoneNumber,
      );

      if (existingByPhone) {
        // Update existing customer with new data
        const updated = await this.update(existingByPhone.id, {
          fullName: customerData.fullName ?? existingByPhone.fullName,
          documentType: customerData.documentType ?? existingByPhone.documentType,
          documentNumber: customerData.documentNumber ?? existingByPhone.documentNumber,
          email: customerData.email ?? existingByPhone.email,
          phoneCode: customerData.phoneCode,
          phoneNumber: customerData.phoneNumber,
        });
        return updated || existingByPhone;
      }
    }

    // Priority 2: Try to find existing customer by document
    if (customerData.documentType && customerData.documentNumber) {
      const existing = await this.findByOrganizationAndDocument(
        organizationId,
        customerData.documentType,
        customerData.documentNumber,
      );

      if (existing) {
        // Update existing customer, including phone if provided
        const updated = await this.update(existing.id, {
          fullName: customerData.fullName,
          email: customerData.email,
          phoneCode: customerData.phoneCode,
          phoneNumber: customerData.phoneNumber,
        });
        return updated || existing;
      }
    }

    // Create new customer - convert undefined to null
    return await this.create({
      organizationId,
      fullName: customerData.fullName ?? null,
      documentType: customerData.documentType ?? null,
      documentNumber: customerData.documentNumber ?? null,
      email: customerData.email ?? null,
      phoneCode: customerData.phoneCode ?? null,
      phoneNumber: customerData.phoneNumber ?? null,
    });
  }
}
