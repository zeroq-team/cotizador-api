import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { regions, communes } from '../database/schemas';
import { eq } from 'drizzle-orm';

@Injectable()
export class ChileLocationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAllRegions() {
    return await this.databaseService.db
      .select()
      .from(regions)
      .orderBy(regions.name);
  }

  async getCommunesByRegion(regionId: number) {
    return await this.databaseService.db
      .select()
      .from(communes)
      .where(eq(communes.regionId, regionId))
      .orderBy(communes.name);
  }

  async getRegionById(regionId: number) {
    const result = await this.databaseService.db
      .select()
      .from(regions)
      .where(eq(regions.id, regionId))
      .limit(1);
    return result[0] || null;
  }

  async getCommuneById(communeId: number) {
    const result = await this.databaseService.db
      .select()
      .from(communes)
      .where(eq(communes.id, communeId))
      .limit(1);
    return result[0] || null;
  }
}

