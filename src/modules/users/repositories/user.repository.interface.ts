import { User, Prisma } from '@prisma/client';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface IUserRepository {
  create(data: Prisma.UserCreateInput): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
}
