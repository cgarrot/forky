import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DatabaseModule } from './common/database/database.module'
import { CollaborationModule } from './modules/collaboration/collaboration.module'
import { EdgesModule } from './modules/edges/edges.module'
import { NodesModule } from './modules/nodes/nodes.module'
import { ProjectsModule } from './modules/projects/projects.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { GuestModule } from './modules/guest/guest.module'
import { EdgeAccessGuard } from './common/guards/edge-access.guard'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { NodeAccessGuard } from './common/guards/node-access.guard'
import { ProjectAccessGuard } from './common/guards/project-access.guard'

const realtimeModules = process.env.JWT_SECRET ? [CollaborationModule] : []

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    GuestModule,
    ProjectsModule,
    NodesModule,
    EdgesModule,
    ...realtimeModules,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtAuthGuard,
    ProjectAccessGuard,
    NodeAccessGuard,
    EdgeAccessGuard,
  ],
})
export class AppModule {}
