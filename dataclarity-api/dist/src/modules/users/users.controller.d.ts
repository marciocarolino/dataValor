import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    create(dto: CreateUserDto): Promise<UserEntity>;
    findAll(): Promise<UserEntity[]>;
    findOne(id: string): Promise<UserEntity>;
    update(id: string, dto: UpdateUserDto): Promise<UserEntity>;
    remove(id: string): Promise<void>;
}
