import { Injectable } from '@angular/core';
import { Avatar } from '../../interfaces/avatar';
import { AVATARS } from '../../constants/avatars';

@Injectable({
  providedIn: 'root',
})
export class AvatarService {
  private allAvatars: Avatar[] = AVATARS;

  getAvatars(): Avatar[] {
    return this.allAvatars;
  }

  getAvatarUrlById(id: number): string {
    const avatar = this.allAvatars.find((a) => a.id === id);
    return avatar ? avatar.imageUrl : 'assets/avatars/default-avatar.svg';
  }
}
