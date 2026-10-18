// Swearing and sexual words in nicknames: blocked when a player picks a name, and masked
// with * wherever other players' names show up (older names, challenge links, other devices).
//
// Names are checked three ways, so spacing, digits and look-alike letters don't slip through:
//   Korean   only the Hangul is kept ("씨 1 발" → "씨발"),
//   letters  only a-z, with 0→o 1→i 3→e 4→a 5→s 7→t 8→b @→a $→s ("f.u.c.k", "sh1t"),
//   words    whole a-z words, for short words that hide inside harmless ones ("grape", "class").

const KOREAN = [
  // 씨발 and friends (시바견 · 시바이누 are dogs)
  '[씨쓰씌쒸쉬슈][이]*[발빨팔벌불봘]',
  '시[이]*[발빨팔벌불봘]',
  '[씨쓰씌]바',
  '시바(?!견|이누)',
  'ㅅㅂ|ㅆㅂ|ㅅ발|ㅆ발|시ㅂ|씨ㅂ',
  '씹|썅|쌍놈|쌍년|쌍노무',
  '[병븅빙]신|병싄|ㅂㅅ|ㅄ|등신',
  '[개게걔](새|쌔|섀|세|색|쌕|쉐|셰)(끼|기|키)?',
  '(새|쌔|섀|색|쌕)끼|ㅅㄲ',
  '좆|좃|존나|졸라|존내|ㅈㄴ|ㅈㄹ|지랄|찌랄|지롤|ㅈ같|조까|ㅈ까',
  '미친|미췬|미칀|ㅁㅊ|또라이|똘아이',
  '엠창|엄창|느금|느검|니애미|니에미|니미|애미|애비|느개비|후레자식|후레새|호로새|호로자식',
  '닥쳐|꺼져|엿먹|찐따',
  '틀딱|한남충|맘충|급식충|일베충|김치녀|된장녀|보슬아치|앰생',
  // Sexual
  '[섹쎅][시스쓰수]?|색스',
  '야동|야스(?!오)|포르노|자위|딸딸|딸치|딸쳐|딸잡',
  // 보지마 · 자지 마 (don't look, don't sleep) are fine
  '보지(?![마말않만도])|봊|잠지|자지(?![마말않만도])|꼬추|고츄',
  '젖꼭지|젖탱|젖가슴|유두|가슴만지|찌찌',
  '강간|성폭|성추행|몰카|창녀|창년|걸레|매춘|원나잇|떡치|떡방|빨통|오르가즘|사까시|펠라',
];

// Matched inside the letters-only text. Every letter may repeat ("fuuuck").
const LETTERS = [
  'fuck', 'fck', 'fuq', 'shit', 'bitch', 'biatch', 'cunt', 'nigger', 'nigga', 'faggot', 'porn', 'pussy',
  'penis', 'vagina', 'dick', 'dildo', 'boob', 'hentai', 'slut', 'whore', 'milf', 'asshole', 'bastard', 'sex',
  'blowjob', 'handjob',
  // Korean typed with the keyboard in English mode (ㅅㅣㅂㅏㄹ → tlqkf)
  'tlqkf', 'qudtls', 'wlfkf', 'alcls', 'whssk', 'tprtm',
];

// Only as a whole word
const WORDS = ['cock', 'tit', 'tits', 'rape', 'anal', 'cum', 'xxx', 'ass', 'fag', 'nude', 'horny', 'sibal', 'shibal', 'ssibal', 'byungsin', 'qhwl', 'wkwl'];

// On the name as typed: 18 (sounds like 씨발) before 놈 · 년 · 새끼
const RAW_RE = /(?<!\d)1\s*8\s*(?=놈|년|새|색|럼)/g;

const repeatable = (w: string) => [...w].map((c) => `${c}+`).join('');
const KOREAN_RE = new RegExp(KOREAN.join('|'), 'g');
const LETTERS_RE = new RegExp(LETTERS.map(repeatable).join('|'), 'g');
const WORD_RE = new RegExp(`^(${WORDS.map(repeatable).join('|')})$`);

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's' };

/** Text made of the kept characters, and where each one came from in the name */
function keep(name: string, pick: (c: string) => string | null): { text: string; at: number[] } {
  let text = '';
  const at: number[] = [];
  for (let i = 0; i < name.length; i++) {
    const c = pick(name[i]);
    if (c) {
      text += c;
      at.push(i);
    }
  }
  return { text, at };
}

const hangul = (c: string) => (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(c) ? c : null);
const letter = (c: string) => {
  const l = LEET[c] ?? c.toLowerCase();
  return /[a-z]/.test(l) ? l : null;
};

/** [start, end) ranges of the name to hide */
function badRanges(name: string): [number, number][] {
  const out: [number, number][] = [];
  for (const [kept, re] of [
    [keep(name, hangul), KOREAN_RE],
    [keep(name, letter), LETTERS_RE],
  ] as const) {
    re.lastIndex = 0;
    for (let m = re.exec(kept.text); m; m = re.exec(kept.text)) {
      if (!m[0]) {
        re.lastIndex++;
        continue;
      }
      out.push([kept.at[m.index], kept.at[m.index + m[0].length - 1] + 1]);
    }
  }
  RAW_RE.lastIndex = 0;
  for (let m = RAW_RE.exec(name); m; m = RAW_RE.exec(name)) out.push([m.index, m.index + m[0].length]);
  // Whole words: runs of letters (look-alike digits count as letters)
  const word = /[a-z0-9@$]+/gi;
  for (let m = word.exec(name); m; m = word.exec(name)) {
    const plain = [...m[0]].map((c) => LEET[c] ?? c.toLowerCase()).join('');
    if (WORD_RE.test(plain)) out.push([m.index, m.index + m[0].length]);
  }
  return out;
}

export const hasBadWords = (name: string): boolean => badRanges(name).length > 0;

/** The name with swearing and sexual words turned into * (spaces stay, so the length still reads) */
export function maskBadWords(name: string): string {
  const ranges = badRanges(name);
  if (!ranges.length) return name;
  const chars = name.split('');
  for (const [from, to] of ranges) for (let i = from; i < to; i++) if (!/\s/.test(chars[i])) chars[i] = '*';
  return chars.join('');
}
