import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NodesModule } from '../nodes/nodes.module';
import { ProjectsModule } from '../projects/projects.module';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationService } from './collaboration.service';
import { WsAuthGuard } from './guards/ws-auth.guard';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
    ProjectsModule,
    forwardRef(() => NodesModule),
  ],
  providers: [CollaborationGateway, CollaborationService, WsAuthGuard],
  exports: [CollaborationService],
})
export class CollaborationModule {}
