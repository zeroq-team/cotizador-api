import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryLevelRepository } from './inventory-level.repository';
import { InventoryLocationService } from './inventory-location.service';
import { InventoryLocationController } from './inventory-location.controller';
import { InventoryLocationRepository } from './inventory-location.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [InventoryController, InventoryLocationController],
  providers: [
    InventoryService,
    InventoryLevelRepository,
    InventoryLocationService,
    InventoryLocationRepository,
  ],
  exports: [
    InventoryService,
    InventoryLevelRepository,
    InventoryLocationService,
    InventoryLocationRepository,
  ],
})
export class InventoryModule {}
