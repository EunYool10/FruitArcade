// 수박 게임 skins from the shop (kind 'suikaSkin'): the 11 sizes, smallest first, become something
// other than fruit. Sizes, colours and points stay the same; only the picture and the name change.
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
  staff_skin_fantasy: {
    emojis: ['✨', '⭐', '🔥', '👻', '👾', '🤖', '🦄', '🦖', '🐉', '🚀', '👑'],
    names: ['마법 가루', '별', '불꽃', '유령', '외계인', '로봇', '유니콘', '공룡', '용', '로켓', '왕관'],
  },
};
