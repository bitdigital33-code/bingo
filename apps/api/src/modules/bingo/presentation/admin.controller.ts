import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BingoFacadeService } from '../application/bingo-facade.service';
import { AdminAuthGuard, type AuthenticatedRequest } from './admin-auth.guard';
import {
  CreateRoomDto,
  DrawEntryDto,
  GeneratePrintableCardsDto,
  InviteMemberDto,
  PrizeShowcaseDto,
  StageMomentDto,
  TvRecentDrawsDto,
  UpdatePlayerDto,
  UpdatePrizeRoundsDto,
  UpdateRoomDto,
  VerifyPrintableCardDto,
} from './dtos';

@Controller('api/v1')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(private readonly facade: BingoFacadeService) {}

  @Get('rooms')
  listRooms(@Req() request: AuthenticatedRequest) {
    return this.facade.listRooms(request.user!);
  }

  @Post('members/invite')
  inviteMember(
    @Req() request: AuthenticatedRequest,
    @Body() body: InviteMemberDto,
  ) {
    return this.facade.inviteMember(request.user!, body);
  }

  @Post('rooms')
  createRoom(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateRoomDto,
  ) {
    return this.facade.createRoom(request.user!, body);
  }

  @Patch('rooms/:id')
  updateRoom(
    @Req() request: AuthenticatedRequest,
    @Param('id') roomId: string,
    @Body() body: UpdateRoomDto,
  ) {
    return this.facade.updateRoom(request.user!, roomId, body);
  }

  @Delete('rooms/:id')
  deleteRoom(
    @Req() request: AuthenticatedRequest,
    @Param('id') roomId: string,
  ) {
    return this.facade.deleteRoom(request.user!, roomId);
  }

  @Get('rooms/:id/history')
  getRoomHistory(
    @Req() request: AuthenticatedRequest,
    @Param('id') roomId: string,
  ) {
    return this.facade.getRoomHistory(request.user!, roomId);
  }

  @Post('rooms/:id/print-cards')
  generatePrintableCards(
    @Req() request: AuthenticatedRequest,
    @Param('id') roomId: string,
    @Body() body: GeneratePrintableCardsDto,
  ) {
    return this.facade.generatePrintableCards(request.user!, roomId, body);
  }

  @Post('rooms/:id/print-cards/verify')
  verifyPrintableCard(
    @Req() request: AuthenticatedRequest,
    @Param('id') roomId: string,
    @Body() body: VerifyPrintableCardDto,
  ) {
    return this.facade.verifyPrintableCard(request.user!, roomId, body);
  }

  @Patch('rooms/:id/prize-rounds')
  updatePrizeRounds(
    @Req() request: AuthenticatedRequest,
    @Param('id') roomId: string,
    @Body() body: UpdatePrizeRoundsDto,
  ) {
    return this.facade.updatePrizeRounds(request.user!, roomId, body);
  }

  @Post('rooms/:id/prize-showcase')
  setPrizeShowcase(
    @Req() request: AuthenticatedRequest,
    @Param('id') roomId: string,
    @Body() body: PrizeShowcaseDto,
  ) {
    return this.facade.setPrizeShowcase(request.user!, roomId, body);
  }

  @Post('rooms/:id/stage-moment')
  setStageMoment(
    @Req() request: AuthenticatedRequest,
    @Param('id') roomId: string,
    @Body() body: StageMomentDto,
  ) {
    return this.facade.setStageMoment(request.user!, roomId, body);
  }

  @Post('rooms/:id/tv/recent-draws')
  setRecentDrawsShowcase(
    @Req() request: AuthenticatedRequest,
    @Param('id') roomId: string,
    @Body() body: TvRecentDrawsDto,
  ) {
    return this.facade.setRecentDrawsShowcase(request.user!, roomId, body);
  }

  @Post('rooms/:id/tv/reset')
  resetTvPresentation(
    @Req() request: AuthenticatedRequest,
    @Param('id') roomId: string,
  ) {
    return this.facade.resetTvPresentation(request.user!, roomId);
  }

  @Patch('rooms/:roomId/players/:playerId')
  updatePlayer(
    @Req() request: AuthenticatedRequest,
    @Param('roomId') roomId: string,
    @Param('playerId') playerId: string,
    @Body() body: UpdatePlayerDto,
  ) {
    return this.facade.updatePlayer(request.user!, roomId, playerId, body);
  }

  @Delete('rooms/:roomId/players/:playerId')
  removePlayer(
    @Req() request: AuthenticatedRequest,
    @Param('roomId') roomId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.facade.removePlayer(request.user!, roomId, playerId);
  }

  @Post('rooms/:id/start-match')
  startMatch(
    @Req() request: AuthenticatedRequest,
    @Param('id') roomId: string,
  ) {
    return this.facade.startMatch(request.user!, roomId);
  }

  @Post('matches/:id/pause')
  pauseMatch(
    @Req() request: AuthenticatedRequest,
    @Param('id') matchId: string,
  ) {
    return this.facade.pauseMatch(request.user!, matchId);
  }

  @Post('matches/:id/resume')
  resumeMatch(
    @Req() request: AuthenticatedRequest,
    @Param('id') matchId: string,
  ) {
    return this.facade.resumeMatch(request.user!, matchId);
  }

  @Post('matches/:id/end')
  endMatch(@Req() request: AuthenticatedRequest, @Param('id') matchId: string) {
    return this.facade.endMatch(request.user!, matchId);
  }

  @Post('matches/:id/draws')
  addDraw(
    @Req() request: AuthenticatedRequest,
    @Param('id') matchId: string,
    @Body() body: DrawEntryDto,
  ) {
    return this.facade.addDraw(request.user!, matchId, body);
  }

  @Post('matches/:id/draws/:drawId/correct')
  correctDraw(
    @Req() request: AuthenticatedRequest,
    @Param('id') matchId: string,
    @Param('drawId') drawId: string,
    @Body() body: DrawEntryDto,
  ) {
    return this.facade.correctDraw(request.user!, matchId, drawId, body);
  }

  @Post('matches/:id/draws/:drawId/revert')
  revertDraw(
    @Req() request: AuthenticatedRequest,
    @Param('id') matchId: string,
    @Param('drawId') drawId: string,
  ) {
    return this.facade.revertDraw(request.user!, matchId, drawId);
  }

  @Post('matches/:id/replay-last')
  replayLast(
    @Req() request: AuthenticatedRequest,
    @Param('id') matchId: string,
  ) {
    return this.facade.replayLast(request.user!, matchId);
  }
}
