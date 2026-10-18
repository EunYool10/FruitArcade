import React from 'react';
import { BarChart3, Crown, ShoppingBag, Trophy, Users } from 'lucide-react';
import type { NavTarget } from './Navbar';

const TABS = [
  { id: 'leaderboard', label: '랭킹', Icon: Crown },
  { id: 'shop', label: '상점', Icon: ShoppingBag },
  { id: 'friends', label: '친구', Icon: Users },
  { id: 'records', label: '내 기록', Icon: BarChart3 },
  { id: 'achievements', label: '업적', Icon: Trophy },
] as const satisfies readonly { id: NavTarget; label: string; Icon: unknown }[];

/**
 * Phones: the lobby's windows in a bar along the bottom. The top bar only has room for
 * sound, settings and the profile there, so these used to be hard to find.
 */
export const MobileTabBar: React.FC<{ friendBadge: number; onOpen: (target: NavTarget) => void }> = ({ friendBadge, onOpen }) => (
  <nav
    aria-label="메뉴"
    className="shrink-0 border-t-2 border-line bg-surface px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] sm:hidden"
  >
    <ul className="mx-auto grid max-w-md grid-cols-5 gap-1">
      {TABS.map(({ id, label, Icon }) => (
        <li key={id}>
          <button
            type="button"
            onClick={() => onOpen(id)}
            aria-label={id === 'friends' && friendBadge ? `${label} (새 소식 ${friendBadge}개)` : label}
            className="relative flex w-full flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold text-ink-2 transition-colors active:bg-surface-2"
          >
            <Icon className="h-5 w-5 text-ink" strokeWidth={2.5} aria-hidden="true" />
            {label}
            {id === 'friends' && friendBadge > 0 && (
              <span className="absolute right-[calc(50%-1.4rem)] top-0 grid h-4 min-w-4 place-items-center rounded-full border-2 border-line bg-berry px-0.5 text-[9px] leading-none text-white">
                {friendBadge > 9 ? '9+' : friendBadge}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  </nav>
);
