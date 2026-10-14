import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { SearchMembersDto } from './dto/search-members.dto.js';
import { MembersService } from './members.service.js';

@Controller('members')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.SECRETARY, Role.ADMIN)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  search(@Query() query: SearchMembersDto) {
    return this.members.search({
      q: query.q,
      limit: query.limit,
      includeArchived:
        query.includeArchived === '1' || query.includeArchived === 'true',
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.members.findById(id);
  }

  @Post()
  create(@Body() dto: CreateMemberDto) {
    return this.members.create(dto);
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(@Param('id') id: string) {
    return this.members.archive(id);
  }

  @Post(':id/activate')
  @HttpCode(200)
  activate(@Param('id') id: string) {
    return this.members.activate(id);
  }
}
