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

  async create(data: NewCustomer): Promise<Customer> {
    // Convert undefined to null for optional fields to avoid SQL issues
    const cleanData: NewCustomer = {
      organizationId: data.organizationId,
      fullName: data.fullName ?? null,
      documentType: data.documentType ?? null,
      documentNumber: data.documentNumber ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      deliveryStreet: data.deliveryStreet ?? null,
      deliveryStreetNumber: data.deliveryStreetNumber ?? null,
      deliveryApartment: data.deliveryApartment ?? null,
      deliveryCity: data.deliveryCity ?? null,
      deliveryRegion: data.deliveryRegion ?? null,
      deliveryPostalCode: data.deliveryPostalCode ?? null,
      deliveryCountry: data.deliveryCountry ?? null,
      deliveryOffice: data.deliveryOffice ?? null,
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
    if (data.phone !== undefined) cleanData.phone = data.phone ?? null;
    if (data.deliveryStreet !== undefined) cleanData.deliveryStreet = data.deliveryStreet ?? null;
    if (data.deliveryStreetNumber !== undefined) cleanData.deliveryStreetNumber = data.deliveryStreetNumber ?? null;
    if (data.deliveryApartment !== undefined) cleanData.deliveryApartment = data.deliveryApartment ?? null;
    if (data.deliveryCity !== undefined) cleanData.deliveryCity = data.deliveryCity ?? null;
    if (data.deliveryRegion !== undefined) cleanData.deliveryRegion = data.deliveryRegion ?? null;
    if (data.deliveryPostalCode !== undefined) cleanData.deliveryPostalCode = data.deliveryPostalCode ?? null;
    if (data.deliveryCountry !== undefined) cleanData.deliveryCountry = data.deliveryCountry ?? null;
    if (data.deliveryOffice !== undefined) cleanData.deliveryOffice = data.deliveryOffice ?? null;

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
      phone?: string;
      deliveryStreet?: string;
      deliveryStreetNumber?: string;
      deliveryApartment?: string;
      deliveryCity?: string;
      deliveryRegion?: string;
      deliveryPostalCode?: string;
      deliveryCountry?: string;
      deliveryOffice?: string;
    },
  ): Promise<Customer> {
    // Try to find existing customer by document
    if (customerData.documentType && customerData.documentNumber) {
      const existing = await this.findByOrganizationAndDocument(
        organizationId,
        customerData.documentType,
        customerData.documentNumber,
      );

      if (existing) {
        // Update existing customer
        const updated = await this.update(existing.id, {
          fullName: customerData.fullName,
          email: customerData.email,
          phone: customerData.phone,
          deliveryStreet: customerData.deliveryStreet,
          deliveryStreetNumber: customerData.deliveryStreetNumber,
          deliveryApartment: customerData.deliveryApartment,
          deliveryCity: customerData.deliveryCity,
          deliveryRegion: customerData.deliveryRegion,
          deliveryPostalCode: customerData.deliveryPostalCode,
          deliveryCountry: customerData.deliveryCountry,
          deliveryOffice: customerData.deliveryOffice,
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
      phone: customerData.phone ?? null,
      deliveryStreet: customerData.deliveryStreet ?? null,
      deliveryStreetNumber: customerData.deliveryStreetNumber ?? null,
      deliveryApartment: customerData.deliveryApartment ?? null,
      deliveryCity: customerData.deliveryCity ?? null,
      deliveryRegion: customerData.deliveryRegion ?? null,
      deliveryPostalCode: customerData.deliveryPostalCode ?? null,
      deliveryCountry: customerData.deliveryCountry ?? null,
      deliveryOffice: customerData.deliveryOffice ?? null,
    });
  }
}

