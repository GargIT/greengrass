import jwt, { SignOptions } from 'jsonwebtoken';

// Define User type locally to avoid Prisma import issues
type User = {
  id: string;
  email: string;
  role: string;
  householdId?: string | null;
};

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  householdId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JWTService {
  private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  private static readonly ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  static generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      householdId: user.householdId || undefined,
    };

    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    } as SignOptions);
  }

  static generateRefreshToken(): string {
    return jwt.sign({}, this.REFRESH_TOKEN_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
    } as SignOptions);
  }

  static generateTokenPair(user: User): TokenPair {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(),
    };
  }

  static verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, this.ACCESS_TOKEN_SECRET) as JWTPayload;
  }

  static verifyRefreshToken(token: string): any {
    return jwt.verify(token, this.REFRESH_TOKEN_SECRET);
  }

  static getRefreshTokenExpiry(): Date {
    const expiresIn = this.REFRESH_TOKEN_EXPIRES_IN;
    const days = parseInt(expiresIn.replace('d', '')) || 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
