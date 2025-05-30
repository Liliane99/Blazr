import { Controller, Post, Body, Res, Get, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: { username: string; password: string }) {
    return this.authService.register(body.username, body.password);
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const jwt = await this.authService.login(body.username, body.password);

    
    res.cookie('jwt', jwt.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 1000 * 60 * 60 * 24, 
      sameSite: 'strict', 
      path: '/',
    });

    
    return { message: 'Connexion réussie' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return { user: req.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
  res.clearCookie('jwt'); 
  return { message: 'Logged out' };
}
}
