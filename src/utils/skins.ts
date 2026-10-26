// Fruit skins from the shop (kind 'suikaSkin', setting suikaSkin): the 11 Suika sizes, smallest
// first, become something other than fruit, and so do the fruit of 과일 자르기, FRUIT DASH and
// 과일 퍼즐 (skinPiece). Sizes, colours and points stay the same; only the picture changes.
// Every emoji needs its picture in public/emoji (see emoji.ts).

export interface SuikaSkin {
  emojis: string[];
  names: string[];
}

/** The fruit themselves (what the free choice looks like in the shop) */
export const SUIKA_DEFAULT: SuikaSkin = {
  emojis: ['🍒', '🍓', '🍇', '🍊', '🍅', '🍎', '🍐', '🍑', '🍍', '🍈', '🍉'],
  names: ['체리', '딸기', '포도', '한라봉', '감', '사과', '배', '복숭아', '파인애플', '멜론', '수박'],
};

/**
 * A game's own fruit as the skin's pieces: the game's fruit list, in order, maps onto the skin's
 * pieces (all different as long as the game has no more than 11 kinds). Anything else (bombs,
 * stars, items) stays as it is, and so does everything without a skin.
 */
export function skinPiece(skinId: string, fruits: readonly string[], emoji: string): string {
  const skin = SUIKA_SKINS[skinId];
  if (!skin) return emoji;
  const i = fruits.indexOf(emoji);
  return i < 0 ? emoji : skin.emojis[i % skin.emojis.length];
}

export const SUIKA_SKINS: Record<string, SuikaSkin> = {
  skin_veggie: {
    emojis: ['🥜', '🧄', '🧅', '🌶️', '🫑', '🥕', '🥔', '🍠', '🌽', '🍆', '🥦'],
    names: ['땅콩', '마늘', '양파', '고추', '피망', '당근', '감자', '고구마', '옥수수', '가지', '브로콜리'],
  },
  skin_animal: {
    emojis: ['🐥', '🐹', '🐰', '🐱', '🐶', '🦊', '🐨', '🐼', '🐯', '🐻', '🐳'],
    names: ['병아리', '햄스터', '토끼', '고양이', '강아지', '여우', '코알라', '판다', '호랑이', '곰', '고래'],
  },
  skin_dessert: {
    emojis: ['🍬', '🍭', '🍪', '🍫', '🍩', '🧁', '🍦', '🍮', '🥧', '🍰', '🎂'],
    names: ['사탕', '막대사탕', '쿠키', '초콜릿', '도넛', '컵케이크', '아이스크림', '푸딩', '파이', '조각 케이크', '생일 케이크'],
  },
  skin_space: {
    emojis: ['✨', '⭐', '🌟', '💫', '☄️', '🌑', '🌕', '🌎', '🪐', '☀️', '🌌'],
    names: ['반짝이', '별', '빛나는 별', '별똥별', '혜성', '그믐달', '보름달', '지구', '토성', '태양', '은하수'],
  },
  skin_sea: {
    emojis: ['🦐', '🐠', '🐡', '🦀', '🐙', '🦑', '🐢', '🦭', '🐬', '🦈', '🐋'],
    names: ['새우', '열대어', '복어', '꽃게', '문어', '오징어', '거북이', '물범', '돌고래', '상어', '고래'],
  },
  skin_snack: {
    emojis: ['🍡', '🍙', '🥟', '🍤', '🍳', '🌭', '🍟', '🍔', '🍕', '🍜', '🍲'],
    names: ['경단', '주먹밥', '만두', '새우튀김', '달걀프라이', '핫도그', '감자튀김', '햄버거', '피자', '라면', '전골'],
  },
  skin_sports: {
    emojis: ['🏓', '🏸', '🎾', '⚾', '🥎', '🎱', '🏐', '⚽', '🏈', '🏀', '🏆'],
    names: ['탁구', '배드민턴', '테니스공', '야구공', '소프트볼', '당구공', '배구공', '축구공', '럭비공', '농구공', '트로피'],
  },
  skin_weather: {
    emojis: ['💧', '❄️', '⚡', '🌙', '☁️', '🌧️', '⛄', '🌪️', '🌈', '☄️', '🌞'],
    names: ['물방울', '눈송이', '번개', '초승달', '구름', '비구름', '눈사람', '회오리', '무지개', '별똥별', '해님'],
  },
  staff_skin_fantasy: {
    emojis: ['✨', '⭐', '🔥', '👻', '👾', '🤖', '🦄', '🦖', '🐉', '🚀', '👑'],
    names: ['마법 가루', '별', '불꽃', '유령', '외계인', '로봇', '유니콘', '공룡', '용', '로켓', '왕관'],
  },
  staff_skin_space: {
    emojis: ['💫', '⭐', '🌟', '☄️', '🌑', '🌙', '🌕', '🌎', '🪐', '☀️', '🌌'],
    names: ['반짝이', '별', '큰 별', '혜성', '그믐달', '초승달', '보름달', '지구', '토성', '태양', '은하수'],
  },
};
