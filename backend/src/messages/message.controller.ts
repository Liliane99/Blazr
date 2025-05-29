import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from 'src/users/user.entity';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body('content') content: string,
    @Body('chatId') chatId: string,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    return this.messageService.createMessageInChat(content, userId, chatId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.messageService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.messageService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('chat/:chatId')
  async findMessagesByChat(
    @Param('chatId') chatId: string,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    return this.messageService.findMessagesByChat(chatId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('markAsRead/:chatId')
  async markMessagesAsRead(
    @Param('chatId') chatId: string,
    @Request() req: any,
  ) {
    console.log('req.user:', req.user);

    const user = req.user as User;

    
    console.log('PATCH /messages/markAsRead/:chatId');
    console.log('chatId:', chatId);
    console.log('userId:', user.id);

    const result = await this.messageService.markMessagesAsRead(chatId, req.user.userId);

    
    console.log('Nombre de messages mis à jour:', result.updated);

    return result;
  }
}
