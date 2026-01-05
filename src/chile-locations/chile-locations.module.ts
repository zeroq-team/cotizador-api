import { Module } from '@nestjs/common';
import { ChileLocationsController } from './chile-locations.controller';
import { ChileLocationsService } from './chile-locations.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ChileLocationsController],
  providers: [ChileLocationsService],
  exports: [ChileLocationsService],
})
export class ChileLocationsModule {}

