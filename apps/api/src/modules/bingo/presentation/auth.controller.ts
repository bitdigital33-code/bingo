import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { BingoFacadeService } from '../application/bingo-facade.service';
import { AdminAuthGuard, type AuthenticatedRequest } from './admin-auth.guard';
import { CreateTenantDto, LoginDto, RefreshDto } from './dtos';

@Controller('api/v1')
export class AuthController {
  constructor(private readonly facade: BingoFacadeService) {}

  @Post('tenants')
  createTenant(@Body() body: CreateTenantDto) {
    return this.facade.createTenant(body);
  }

  @Post('auth/login')
  login(@Body() body: LoginDto) {
    return this.facade.login(body);
  }

  @Post('auth/refresh')
  refresh(@Body() body: RefreshDto) {
    return this.facade.refresh(body.refreshToken);
  }

  @Get('auth/bootstrap')
  @UseGuards(AdminAuthGuard)
  bootstrap(@Req() request: AuthenticatedRequest) {
    return this.facade.getBootstrap(request.user!);
  }
}
