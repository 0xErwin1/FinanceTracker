import { Exclude, Expose, Type } from 'class-transformer';
import { UserDTO } from '..';

@Exclude()
export class SessionDTO {
  @Expose()
  declare readonly sessionId: string;

  @Expose()
  declare readonly token: string;

  @Expose()
  declare readonly deletedAt: Date;

  @Expose()
  declare readonly userId: string;

  @Type(() => UserDTO)
  @Expose()
  declare readonly user: UserDTO;
}
