import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Chat } from './chat.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(name: string, participantUsernames: string[]) {
    const participants = await this.userRepository.find({
      where: { username: In(participantUsernames) },
    });

    if (participants.length !== participantUsernames.length) {
      throw new NotFoundException('Un ou plusieurs utilisateurs introuvables');
    }

    const chat = this.chatRepository.create({
      name,
      participants,
    });

    return this.chatRepository.save(chat);
  }

  findAll() {
    return this.chatRepository.find({ relations: ['participants'] });
  }

  findById(id: string) {
    return this.chatRepository.findOne({
      where: { id },
      relations: ['participants', 'messages', 'messages.sender'],
    });
  }

  async findChatsForUser(userId: string) {
  return this.chatRepository
    .createQueryBuilder('chat')
    .leftJoinAndSelect('chat.participants', 'participant')
    .leftJoinAndSelect('chat.messages', 'message')
    .leftJoinAndSelect('message.sender', 'sender')
    .where('participant.id = :userId', { userId })
    .orderBy('message.timestamp', 'ASC')
    .getMany();
}
}
