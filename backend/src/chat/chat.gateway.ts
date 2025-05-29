import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { MessageService } from '../messages/message.service';
import { UserService } from '../users/user.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
  },
  transports: ['polling', 'websocket'],  // Ajout des transports pour assurer la compatibilité
  namespace: '/', // optionnel mais clair
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userChats = new Map<string, Set<string>>();

  constructor(
    private readonly chatService: ChatService,
    private readonly messageService: MessageService,
    private readonly userService: UserService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connecté : ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client déconnecté : ${client.id}`);
    this.userChats.delete(client.id);
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: { chatId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { chatId, userId } = data;

    try {
      const chat = await this.chatService.findById(chatId);
      if (!chat) {
        client.emit('error', 'Chat introuvable');
        return;
      }

      const isParticipant = chat.participants.some((p) => p.id === userId);
      if (!isParticipant) {
        client.emit('error', 'Accès refusé au chat');
        return;
      }

      client.join(chatId);

      if (!this.userChats.has(client.id)) {
        this.userChats.set(client.id, new Set());
      }
      const userChatSet = this.userChats.get(client.id);
      if (userChatSet) {
        userChatSet.add(chatId);
      }

      client.emit('joinedChat', chatId);
      console.log(`Client ${client.id} a rejoint le chat ${chatId}`);
    } catch (error) {
      client.emit('error', 'Erreur lors de la jointure du chat');
      console.error(error);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { chatId: string; userId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { chatId, userId, content } = data;

    try {
      const chat = await this.chatService.findById(chatId);
      if (!chat) {
        client.emit('error', 'Chat introuvable');
        return;
      }

      const isParticipant = chat.participants.some((p) => p.id === userId);
      if (!isParticipant) {
        client.emit('error', "Vous n'êtes pas autorisé à envoyer un message dans ce chat");
        return;
      }

      const message = await this.messageService.createMessageInChat(content, userId, chatId);

      this.server.to(chatId).emit('newMessage', message);
      console.log(`Message envoyé dans chat ${chatId} par user ${userId}`);
    } catch (error) {
      client.emit('error', "Erreur lors de l'envoi du message");
      console.error(error);
    }
  }
}
