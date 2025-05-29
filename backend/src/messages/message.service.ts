import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { Chat } from '../chat/chat.entity';
import { User } from '../users/user.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createMessageInChat(content: string, senderId: string, chatId: string) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['participants'],
    });

    if (!chat) {
      throw new NotFoundException('Chat introuvable');
    }

    const isParticipant = chat.participants.some((p) => p.id === senderId);
    if (!isParticipant) {
      throw new ForbiddenException('Utilisateur non autorisé à écrire dans ce chat');
    }

    const sender = await this.userRepository.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const message = this.messageRepository.create({
      content,
      sender,
      chat,
    });

    return this.messageRepository.save(message);
  }

  findAll() {
    return this.messageRepository.find({ relations: ['sender', 'chat'] });
  }

  findOne(id: string) {
    return this.messageRepository.findOne({
      where: { id },
      relations: ['sender', 'chat'],
    });
  }

  async findMessagesByChat(chatId: string, userId: string) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['participants'],
    });

    if (!chat) {
      throw new NotFoundException('Conversation non trouvée');
    }

    const isParticipant = chat.participants.some((p) => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException("Vous n'avez pas accès à cette conversation");
    }

    return this.messageRepository.find({
      where: { chat: { id: chatId } },
      relations: ['sender'],
      order: { timestamp: 'ASC' },
    });
  }
}
