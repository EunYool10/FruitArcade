// Coin limits, kept apart from the Firestore code so windows can show them without loading it

/**
 * Most coins a player can hold, and the most an admin can send at once (999억 9,999만 9,999).
 * Bigger numbers didn't fit the coin chips and lose precision past 2^53.
 */
export const COIN_MAX = 99_999_999_999;

/** Gifts a day and coins per gift. Same numbers as isGiftSlot / isValidGift in firestore.rules. */
export const GIFT_LIMITS = {
  player: { perDay: 5, max: 300 },
  admin: { perDay: 20, max: COIN_MAX },
};
