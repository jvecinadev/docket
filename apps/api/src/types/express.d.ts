import type { PublicSession, PublicUser } from "@docket/types";

export {};

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
      auth?: {
        user: PublicUser;
        session: PublicSession;
      };
    }
  }
}