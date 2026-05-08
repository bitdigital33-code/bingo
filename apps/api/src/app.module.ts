import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BingoModule } from './modules/bingo/bingo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BingoModule,
  ],
})
export class AppModule {}
