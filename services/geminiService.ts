
/**
 * Local Commentary Engine
 * Replaces external API calls to ensure stable deployment on Vercel
 * without requiring API keys or handling network timeouts.
 */

export const generateRunnerNames = async (count: number): Promise<string[]> => {
  return Array.from({ length: count }, (_, i) => `Athlete ${i + 1}`);
};

export const getRaceCommentary = async (runners: any[], status: string): Promise<string> => {
  if (status !== 'RACING') return "경기가 곧 시작됩니다. 선수들이 준비 중입니다!";

  const sorted = [...runners].sort((a, b) => b.progress - a.progress);
  const leader = sorted[0];
  const progressPercent = Math.round((leader?.progress || 0) * 100);
  
  const midRacePhraces = [
    `현재 1위는 ${leader?.id}번 선수! 엄청난 속도입니다!`,
    `${leader?.id}번 선수, 선두를 유지하며 코너를 공략합니다!`,
    "중반전으로 접어들며 순위 싸움이 치열해지고 있습니다!",
    "관중들의 함성이 커지고 있습니다. 정말 박진감 넘치는 레이스네요!",
    "선두권 선수들, 서로의 페이스를 체크하며 기회를 엿보고 있습니다."
  ];

  const finalStretchPhrases = [
    `마지막 직선 코스! ${leader?.id}번 선수가 치고 나갑니다!`,
    "결승선이 보입니다! 마지막 스퍼트를 올리는 선수들!",
    "과연 영광의 1위는 누가 차지할 것인가!",
    "혼신의 힘을 다한 질주! 정말 드라마틱한 엔딩이 예상됩니다!",
    `현재 선두 ${leader?.id}번! 하지만 뒤쪽에서 무섭게 추격해옵니다!`
  ];

  if (progressPercent < 30) {
    return "초반 기세가 대단합니다! 모든 선수들이 힘차게 출발했습니다.";
  } else if (progressPercent < 85) {
    return midRacePhraces[Math.floor(Math.random() * midRacePhraces.length)];
  } else {
    return finalStretchPhrases[Math.floor(Math.random() * finalStretchPhrases.length)];
  }
};
