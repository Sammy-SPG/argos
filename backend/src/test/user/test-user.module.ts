import { Module } from '@nestjs/common';
import { TestUserController } from '@src/test/user/test-user.controller';

@Module({ controllers: [TestUserController] })
export class TestUserModule {}
