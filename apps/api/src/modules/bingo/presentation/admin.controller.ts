import {
  Body,
  Controller,
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
  InviteMemberDto,
  UpdateRoomDto,
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
  inviteMember(@Req() request: AuthenticatedRequest, @Body() body: InviteMemberDto) {
    return this.facade.inviteMember(request.user!, body);
  }

  @Post('rooms')
  createRoom(@Req() request: AuthenticatedRequest, @Body() body: CreateRoomDto) {
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

  @Post('rooms/:id/start-match')
  startMatch(@Req() request: AuthenticatedRequest, @Param('id') roomId: string) {
    return this.facade.startMatch(request.user!, roomId);
  }

  @Post('matches/:id/pause')
  pauseMatch(@Req() request: AuthenticatedRequest, @Param('id') matchId: string) {
    return this.facade.pauseMatch(request.user!, matchId);
  }

  @Post('matches/:id/resume')
  resumeMatch(@Req() request: AuthenticatedRequest, @Param('id') matchId: string) {
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
  replayLast(@Req() request: AuthenticatedRequest, @Param('id') matchId: string) {
    return this.facade.replayLast(request.user!, matchId);
  }
}
