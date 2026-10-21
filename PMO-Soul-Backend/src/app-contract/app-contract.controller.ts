import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import { AppContractService } from './app-contract.service';

interface AuthenticatedRequest {
  userPermissions?: Record<string, Record<string, boolean> | undefined>;
  isPlatformAdmin?: boolean;
}

/**
 * What this app is, for something that builds UI against it.
 *
 * Permission-filtered per caller, exactly like the grounding pack it is built from: a builder
 * connected with a restricted token sees only what that role can reach, so a page can never be
 * designed against data its designer is not allowed to see.
 */
@ApiTags('App Contract')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('app-contract')
export class AppContractController {
  constructor(private readonly contract: AppContractService) {}

  @Get()
  @ApiOperation({
    summary: 'The app\'s entities, APIs and workflow touchpoints',
    description:
      'Published by the app itself, so it can never be stale: change the schema or a workflow ' +
      'and the contract changes with it.',
  })
  async get(@Req() request: AuthenticatedRequest) {
    return this.contract.build({
      permissions: request.userPermissions,
      isPlatformAdmin: request.isPlatformAdmin,
    });
  }
}
