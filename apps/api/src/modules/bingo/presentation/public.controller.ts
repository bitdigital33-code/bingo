import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BingoFacadeService } from '../application/bingo-facade.service';
import { JoinRoomDto } from './dtos';

@Controller('public')
export class PublicController {
  constructor(private readonly facade: BingoFacadeService) {}

  @Post('rooms/:joinCode/join')
  async joinRoom(
    @Param('joinCode') joinCode: string,
    @Body() body: JoinRoomDto,
  ) {
    return this.facade.joinRoom(joinCode, body);
  }

  @Get('rooms/:joinCode/state')
  async getState(@Param('joinCode') joinCode: string) {
    return this.facade.getPublicState(joinCode);
  }

  @Get('rooms/:joinCode/tv-state')
  async getTvState(@Param('joinCode') joinCode: string) {
    return this.facade.getTvState(joinCode);
  }

  @Get('cards/:accessCode')
  async getPrintedCard(@Param('accessCode') accessCode: string) {
    return this.facade.getPrintedCard(accessCode);
  }
}
