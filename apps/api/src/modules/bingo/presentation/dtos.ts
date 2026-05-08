import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { BingoLetter, MemberRole, ThemeKey } from '@bingo/contracts';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  tenantName!: string;

  @IsString()
  @MinLength(3)
  slug!: string;

  @IsString()
  @MinLength(2)
  ownerName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class InviteMemberDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(['owner', 'admin', 'operator'] as const)
  role!: MemberRole;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class CreateRoomDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsEnum(['natal', 'cassino', 'neon', 'junina', 'infantil'] as const)
  theme!: ThemeKey;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  maxCardsPerPlayer!: number;

  @IsBoolean()
  allowAutoMark!: boolean;

  @IsBoolean()
  allowManualMark!: boolean;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @IsEnum(['natal', 'cassino', 'neon', 'junina', 'infantil'] as const)
  theme?: ThemeKey;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  maxCardsPerPlayer?: number;

  @IsOptional()
  @IsBoolean()
  allowAutoMark?: boolean;

  @IsOptional()
  @IsBoolean()
  allowManualMark?: boolean;
}

export class DrawEntryDto {
  @IsEnum(['B', 'I', 'N', 'G', 'O'] as const)
  letter!: BingoLetter;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(75)
  value!: number;
}

export class JoinRoomDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  cardsRequested?: number;
}

export class ClaimDto {
  @IsOptional()
  @IsString()
  playerToken?: string;
}
