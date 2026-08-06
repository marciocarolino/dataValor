import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @ApiCreatedResponse({ type: UserEntity })
  @ApiTooManyRequestsResponse({ description: 'Rate limit excedido.' })
  async create(@Body() dto: CreateUserDto): Promise<UserEntity> {
    return this.users.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: UserEntity, isArray: true })
  @ApiTooManyRequestsResponse({ description: 'Rate limit excedido.' })
  async findAll(): Promise<UserEntity[]> {
    return this.users.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: UserEntity })
  @ApiTooManyRequestsResponse({ description: 'Rate limit excedido.' })
  async findOne(@Param('id') id: string): Promise<UserEntity> {
    return this.users.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: UserEntity })
  @ApiTooManyRequestsResponse({ description: 'Rate limit excedido.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiNoContentResponse()
  @ApiTooManyRequestsResponse({ description: 'Rate limit excedido.' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.users.remove(id);
  }
}
