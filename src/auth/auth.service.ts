import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuthEntity } from './entity/auth.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AuthEntity> {
    // 第一步：通过 email 拿到一个用户
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // 如果用户不存在，抛出错误
    if (!user) {
      throw new NotFoundException(`No user found with email: ${email}`);
    }

    // 第二步：检查密码是否正确
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // 如果密码不匹配，抛出错误
    if (!isPasswordValid) {
      throw new UnauthorizedException(`Invalid password`);
    }

    // 第三步：使用 user.id 签名生成 JWT
    return {
      accessToken: this.jwtService.sign({ userId: user.id }),
    };
  }
}
