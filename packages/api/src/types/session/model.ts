export interface SessionDTO {
  id: string;
  token: string;
  deletedAt?: Date | null;
  userId: string;
}
