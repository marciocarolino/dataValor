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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @ApiCreatedResponse({ type: UserEntity })
  async create(@Body() dto: CreateUserDto): Promise<UserEntity> {
    return this.users.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: UserEntity, isArray: true })
  async findAll(): Promise<UserEntity[]> {
    return this.users.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: UserEntity })
  async findOne(@Param('id') id: string): Promise<UserEntity> {
    return this.users.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: UserEntity })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@Param('id') id: string): Promise<void> {
    return this.users.remove(id);
  }
}
