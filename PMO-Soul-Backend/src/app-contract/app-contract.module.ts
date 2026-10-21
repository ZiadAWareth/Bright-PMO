import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AgentModule } from '../agent/agent.module';
import { AppContractController } from './app-contract.controller';
import { AppContractService } from './app-contract.service';

/**
 * AgentModule is imported for GroundingService, which it exports. The contract is a projection of
 * the grounding pack, so importing the module that owns it is what keeps there being ONE answer
 * to "what does this app contain".
 */
@Module({
  imports: [PrismaModule, AgentModule],
  controllers: [AppContractController],
  providers: [AppContractService],
  exports: [AppContractService],
})
export class AppContractModule {}
