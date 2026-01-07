import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [ConfigModule],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}

