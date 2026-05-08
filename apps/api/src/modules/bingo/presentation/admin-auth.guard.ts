import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import type { StoredUser } from '../domain/internal-types';
import { BingoStoreService } from '../infrastructure/bingo-store.service';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: StoredUser;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly store: BingoStoreService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token ausente.');
    }

    const token = header.slice(7);

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET ?? 'bingo-secret',
      });
      const user = await this.store.getUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Usuario nao encontrado.');
      }
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Token invalido.');
    }
  }
}
