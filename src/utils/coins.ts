// Coin limits, kept apart from the Firestore code so windows can show them without loading it

/**
 * Most coins a player can hold, and the most an admin can send at once (999억 9,999만 9,999).
 * Bigger numbers didn't fit the coin chips and lose precision past 2^53.
 */
export const COIN_MAX = 99_999_999_999;

/**
 * Gifts a day and coins per gift. Same numbers as isGiftSlot / isValidGift in firestore.rules:
 * admins send as often as they like, up to the coin cap each time.
 */
export const GIFT_LIMITS = {
  player: { perDay: 5, max: 300 },
  admin: { perDay: Infinity, max: COIN_MAX },
};

/** A checked round's coins, signed by the score server (stored as coinGrants/{id}) */
export interface CoinGrant {
  id: string;
  coins: number;
  sig: string;
}

/** A round may add its signed grant plus at most this in bonuses (same as grantRoom in firestore.rules) */
export const GRANT_BONUS = 85;

/** Coins a new account may bring from the device it played on before signing in (firestore.rules: 1000) */
export const FIRST_COINS_MAX = 1000;
