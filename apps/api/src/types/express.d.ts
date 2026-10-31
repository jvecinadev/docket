import type { PublicUser } from "@docket/types";

export {};

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}