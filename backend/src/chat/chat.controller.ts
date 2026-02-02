import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async sendMessage(@Body() body: { message: string }) {
    const reply = await this.chatService.reply(body.message ?? '');
    return { reply };
  }
}
