export {};

declare global {
  namespace Express {
    interface UserPayload {
      userId: string;
      role?: string;
      email?: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}
