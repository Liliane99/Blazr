import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Req() req: Request,
    @Body('name') name: string,
    @Body('participantUsernames') participantUsernames: string[],
  ) {
    const creatorUsername = req.user?.['username'];
    if (!creatorUsername) {
      throw new Error("Username non défini dans la requête");
    }

    // Ajoute le créateur dans la liste sans doublons
    const allUsernames = Array.from(new Set([...participantUsernames, creatorUsername]));

    return this.chatService.create(name, allUsernames);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.chatService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.chatService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/me')
  findChatsForCurrentUser(@Req() req: Request) {
    const userId = req.user?.['userId'];
    if (!userId) {
      throw new Error('User ID is not defined in the request');
    }
    return this.chatService.findChatsForUser(userId);
  }
}
