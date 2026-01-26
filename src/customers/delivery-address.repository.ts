import { Injectable } from '@nestjs/common';
import { eq, and, isNull, ne } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  deliveryAddresses,
  type DeliveryAddress,
  type NewDeliveryAddress,
} from '../database/schemas';

@Injectable()
export class DeliveryAddressRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findById(id: string, includeDeleted = false): Promise<DeliveryAddress | null> {
    const conditions = includeDeleted
      ? eq(deliveryAddresses.id, id)
      : and(eq(deliveryAddresses.id, id), isNull(deliveryAddresses.deletedAt));

    const result = await this.databaseService.db
      .select()
      .from(deliveryAddresses)
      .where(conditions)
      .limit(1);

    return result[0] || null;
  }

  async findByCustomerId(customerId: string, includeDeleted = false): Promise<DeliveryAddress[]> {
    const conditions = includeDeleted
      ? eq(deliveryAddresses.customerId, customerId)
      : and(
          eq(deliveryAddresses.customerId, customerId),
          isNull(deliveryAddresses.deletedAt),
        );

    return await this.databaseService.db
      .select()
      .from(deliveryAddresses)
      .where(conditions);
  }

  async findDefaultByCustomerId(customerId: string): Promise<DeliveryAddress | null> {
    const result = await this.databaseService.db
      .select()
      .from(deliveryAddresses)
      .where(
        and(
          eq(deliveryAddresses.customerId, customerId),
          eq(deliveryAddresses.isDefault, true),
          isNull(deliveryAddresses.deletedAt),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  async create(data: NewDeliveryAddress): Promise<DeliveryAddress> {
    // If this is set as default, unset other defaults for this customer
    // (no need to exclude any address since this is a new one)
    if (data.isDefault) {
      await this.unsetDefaultsForCustomer(data.customerId);
    }

    const cleanData: NewDeliveryAddress = {
      customerId: data.customerId,
      street: data.street ?? null,
      streetNumber: data.streetNumber ?? null,
      apartment: data.apartment ?? null,
      commune: data.commune ?? null,
      region: data.region ?? null,
      postalCode: data.postalCode ?? null,
      country: data.country ?? null,
      office: data.office ?? null,
      isDefault: data.isDefault ?? false,
    };

    const result = await this.databaseService.db
      .insert(deliveryAddresses)
      .values(cleanData)
      .returning();

    return result[0];
  }

  async update(id: string, data: Partial<NewDeliveryAddress>): Promise<DeliveryAddress | null> {
    // Check if address exists and is not deleted
    const address = await this.findById(id);
    if (!address || address.deletedAt) {
      return null;
    }

    const cleanData: Partial<NewDeliveryAddress> = {};
    if (data.street !== undefined) cleanData.street = data.street ?? null;
    if (data.streetNumber !== undefined) cleanData.streetNumber = data.streetNumber ?? null;
    if (data.apartment !== undefined) cleanData.apartment = data.apartment ?? null;
    if (data.commune !== undefined) cleanData.commune = data.commune ?? null;
    if (data.region !== undefined) cleanData.region = data.region ?? null;
    if (data.postalCode !== undefined) cleanData.postalCode = data.postalCode ?? null;
    if (data.country !== undefined) cleanData.country = data.country ?? null;
    if (data.office !== undefined) cleanData.office = data.office ?? null;
    if (data.isDefault !== undefined) cleanData.isDefault = data.isDefault;

    // Only update if there's something to update
    if (Object.keys(cleanData).length === 0) {
      return address;
    }

    // Use transaction to ensure atomicity when setting default
    if (data.isDefault === true) {
      return await this.databaseService.db.transaction(async (tx) => {
        // First, unset all other defaults for this customer (excluding this address)
        const unsetConditions = [
          eq(deliveryAddresses.customerId, address.customerId),
          eq(deliveryAddresses.isDefault, true),
          isNull(deliveryAddresses.deletedAt),
          ne(deliveryAddresses.id, id),
        ];
        
        await tx
          .update(deliveryAddresses)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(...unsetConditions));

        // Then, update the current address
        const result = await tx
          .update(deliveryAddresses)
          .set({
            ...cleanData,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(deliveryAddresses.id, id),
              isNull(deliveryAddresses.deletedAt),
            ),
          )
          .returning();

        return result[0] || null;
      });
    }

    // If not setting as default, just update normally
    const result = await this.databaseService.db
      .update(deliveryAddresses)
      .set({
        ...cleanData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(deliveryAddresses.id, id),
          isNull(deliveryAddresses.deletedAt),
        ),
      )
      .returning();

    return result[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    // Check if address exists and is not already deleted
    const address = await this.findById(id);
    if (!address || address.deletedAt) {
      return false;
    }

    // Soft delete: set deletedAt timestamp
    const result = await this.databaseService.db
      .update(deliveryAddresses)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        isDefault: false, // Unset default if this was the default address
      })
      .where(
        and(
          eq(deliveryAddresses.id, id),
          isNull(deliveryAddresses.deletedAt),
        ),
      )
      .returning();

    // If this was the default address, set another one as default
    if (result.length > 0 && result[0].isDefault) {
      const customerId = result[0].customerId;
      const remainingAddresses = await this.findByCustomerId(customerId);
      if (remainingAddresses.length > 0) {
        await this.update(remainingAddresses[0].id, { isDefault: true });
      }
    }

    return result.length > 0;
  }

  async upsert(
    customerId: string,
    addressData: {
      street?: string;
      streetNumber?: string;
      apartment?: string;
      commune?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      office?: string;
      isDefault?: boolean;
    },
  ): Promise<DeliveryAddress> {
    // Try to find existing default address
    const existingDefault = await this.findDefaultByCustomerId(customerId);

    if (existingDefault) {
      // Update existing default address
      const updated = await this.update(existingDefault.id, {
        street: addressData.street,
        streetNumber: addressData.streetNumber,
        apartment: addressData.apartment,
        commune: addressData.commune,
        region: addressData.region,
        postalCode: addressData.postalCode,
        country: addressData.country,
        office: addressData.office,
        isDefault: addressData.isDefault ?? true,
      });
      return updated || existingDefault;
    }

    // Create new address as default
    return await this.create({
      customerId,
      street: addressData.street ?? null,
      streetNumber: addressData.streetNumber ?? null,
      apartment: addressData.apartment ?? null,
      commune: addressData.commune ?? null,
      region: addressData.region ?? null,
      postalCode: addressData.postalCode ?? null,
      country: addressData.country ?? null,
      office: addressData.office ?? null,
      isDefault: addressData.isDefault ?? true,
    });
  }

  private async unsetDefaultsForCustomer(customerId: string, excludeAddressId?: string): Promise<void> {
    const conditions = [
      eq(deliveryAddresses.customerId, customerId),
      eq(deliveryAddresses.isDefault, true),
      isNull(deliveryAddresses.deletedAt),
    ];

    // Exclude the address being updated from being unset
    if (excludeAddressId) {
      conditions.push(ne(deliveryAddresses.id, excludeAddressId));
    }

    const whereClause = and(...conditions);
    
    const result = await this.databaseService.db
      .update(deliveryAddresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(whereClause)
      .returning();
  }
}
