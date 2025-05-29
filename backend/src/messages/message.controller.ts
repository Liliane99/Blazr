import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
}
