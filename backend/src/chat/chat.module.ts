import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat } from './chat.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { User } from 'src/users/user.entity';
import { UserModule } from 'src/users/user.module';
import { ChatGateway } from './chat.gateway';
import { MessageModule } from '../messages/message.module';
import { Message } from 'src/messages/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, User, Message]),
  UserModule, forwardRef(() => MessageModule),],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
