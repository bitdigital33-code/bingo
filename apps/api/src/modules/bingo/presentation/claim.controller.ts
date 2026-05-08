import { Body, Controller, Param, Post } from '@nestjs/common';
import { BingoFacadeService } from '../application/bingo-facade.service';
import { ClaimDto } from './dtos';

@Controller('api/v1/matches')
export class ClaimController {
  constructor(private readonly facade: BingoFacadeService) {}

  @Post(':id/claims')
  async claim(@Param('id') matchId: string, @Body() body: ClaimDto) {
    return this.facade.claim(matchId, body.playerToken);
  }
}
