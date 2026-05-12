import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type {
  BingoLetter,
  MemberRole,
  PrizePattern,
  StageMomentKey,
  ThemeKey,
} from '@bingo/contracts';

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

export class CreateRoomPrizeRoundDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  label!: string;

  @IsEnum(['single_line', 'double_line', 'full_house', 'marked_count'] as const)
  pattern!: PrizePattern;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  targetMarks?: number;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  prize!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(220)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_200_000)
  photoDataUrl?: string;
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

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRoomPrizeRoundDto)
  prizeRounds?: CreateRoomPrizeRoundDto[];
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

export class UpdatePlayerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  avatar?: string;

  @IsOptional()
  @IsBoolean()
  autoMark?: boolean;
}

export class GeneratePrintableCardsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn([2, 4, 6])
  cardsPerPage?: 2 | 4 | 6;
}

export class VerifyPrintableCardDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  code!: string;
}

export class UpdatePrizeRoundDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  label!: string;

  @IsEnum(['single_line', 'double_line', 'full_house', 'marked_count'] as const)
  pattern!: PrizePattern;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  targetMarks?: number;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  prize!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(220)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_200_000)
  photoDataUrl?: string;

  @IsOptional()
  @IsBoolean()
  removePhoto?: boolean;
}

export class UpdatePrizeRoundsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdatePrizeRoundDto)
  rounds!: UpdatePrizeRoundDto[];
}

export class PrizeShowcaseDto {
  @IsOptional()
  @IsString()
  roundId?: string;

  @IsBoolean()
  visible!: boolean;
}

export class StageMomentDto {
  @IsOptional()
  @IsEnum([
    'warmup',
    'attention',
    'next_prize',
    'last_call',
    'celebration',
    'near_win',
  ] as const)
  key?: StageMomentKey;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  message?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(20)
  durationSeconds?: number;

  @IsBoolean()
  visible!: boolean;
}

export class TvRecentDrawsDto {
  @IsBoolean()
  visible!: boolean;
}
