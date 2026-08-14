/**
 * Local Commentary Engine - Korean Sports Caster Style
 * Provides dynamic, exciting race commentary like a real Korean sports broadcaster.
 * Commentary changes based on race phase, leader position, and dramatic moments.
 */

export const generateRunnerNames = async (count: number): Promise<string[]> => {
  return Array.from({ length: count }, (_, i) => `${i + 1}번`);
};

export const getRaceCommentary = async (runners: any[], status: string): Promise<string> => {
  if (status !== 'RACING') return "선수 여러분, 출발선에 서 주십시오!";

  const sorted = [...runners].sort((a, b) => b.progress - a.progress);
  const leader = sorted[0];
  const second = sorted[1];
  const third = sorted[2];
  const progressPercent = Math.round((leader?.progress || 0) * 100);
  const leaderName = leader?.name || `${leader?.id}번`;
  const secondName = second?.name || `${second?.id}번`;
  const thirdName = third?.name || `${third?.id}번`;

  // Check for close race (gap between 1st and 2nd)
  const gap = leader && second ? leader.progress - second.progress : 0;
  const isCloseRace = gap < 0.03;
  const isBigLead = gap > 0.08;

  // Phase-specific commentary
  if (progressPercent < 15) {
    const phrases = [
      "출발했습니다! 45명의 선수가 일제히 트랙을 박차고 나갑니다!",
      "방금 출발 신호가 울렸습니다! 선수들이 폭발적인 스타트를 보여주고 있어요!",
      "모든 선수가 전력 질주를 시작합니다! 과연 누가 6개의 당첨 번호에 이름을 올릴까요!",
      `출발 직후 ${leaderName} 선수가 좋은 반응속도를 보여주고 있습니다!`,
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  if (progressPercent < 35) {
    const phrases = [
      `초반 선두는 ${leaderName} 선수! ${secondName} 선수가 바로 뒤를 쫓고 있습니다!`,
      `${leaderName} 선수, 빠른 페이스로 앞서 나가고 있어요! 하지만 아직 레이스는 길다!`,
      "아직 초반입니다! 선수들이 자신의 페이스를 잡아가는 중이에요!",
      `현재 선두 그룹은 ${leaderName}, ${secondName}, ${thirdName} 선수! 접전이 예상됩니다!`,
      isCloseRace ? "선두 그룹이 한 덩어리로 몰려가고 있습니다! 정말 치열해요!" : `${leaderName} 선수가 초반부터 기분 좋은 달리기를 보여주고 있습니다!`,
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  if (progressPercent < 55) {
    const phrases = [
      `중반에 접어들었습니다! ${leaderName} 선수 여전히 선두를 지키고 있어요!`,
      isBigLead
        ? `${leaderName} 선수가 독주 체제로 가고 있습니다! 상당한 격차를 벌리고 있어요!`
        : `${leaderName}과 ${secondName} 선수, 어깨를 나란히 하고 달리고 있습니다!`,
      "트랙 위의 열기가 뜨겁습니다! 선수들의 표정에서 투지가 느껴져요!",
      `${thirdName} 선수도 맹추격 중입니다! 3위 자리를 놓칠 수 없다는 각오에요!`,
      isCloseRace ? "아 정말 대단합니다! 거의 동시에 달리고 있어요! 누가 이길지 모릅니다!" : `${leaderName} 선수의 폼이 정말 좋습니다! 안정적인 달리기를 이어가고 있어요!`,
      "45명의 선수 중 과연 6명만이 영광의 결승선을 통과합니다! 살아남을 번호는!",
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  if (progressPercent < 75) {
    const phrases = [
      `후반전에 돌입했습니다! ${leaderName} 선수가 속도를 올리고 있어요!`,
      `${secondName} 선수! 무서운 추격입니다! ${leaderName} 선수를 바짝 쫓고 있어요!`,
      isBigLead
        ? `${leaderName} 선수 독주! 이대로 가면 1등 확정이에요!`
        : "선두 다툼이 점점 격렬해지고 있습니다! 정말 한 치 앞을 모르는 레이스!",
      "순위 변동이 있을 수 있습니다! 뒤에서 추월 시도가 이어지고 있어요!",
      `결승선이 다가오고 있습니다! ${leaderName}, ${secondName} 선수 혼신의 질주!`,
      "39명은 결승선을 밟지 못합니다! 생존을 건 필사의 스프린트가 이어지고 있어요!",
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  if (progressPercent < 92) {
    const phrases = [
      `마지막 코너를 돌았습니다! ${leaderName} 선수가 앞서가고 있어요!`,
      "결승선이 눈앞입니다! 선수들이 마지막 힘을 쥐어짜고 있어요!",
      `${leaderName} 선수! 결승선까지 얼마 남지 않았습니다! 이대로 갈 수 있을까!`,
      isCloseRace
        ? `아 정말 접전입니다! ${leaderName}과 ${secondName} 선수, 사실상 동시에 달리고 있어요!`
        : `${leaderName} 선수가 결승선을 향해 돌진합니다!`,
      "과연 6개의 행운 번호는! 결승선 통과 순간이 다가옵니다!",
      `${thirdName} 선수도 3위 자리를 사수하며 결승선으로 달려갑니다!`,
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  // Final stretch (92%+)
  const phrases = [
    `${leaderName} 선수 결승선 직전입니다! 골인!`,
    "마지막 스퍼트! 결승선을 통과하는 선수가 나옵니다!",
    `들어옵니다! ${leaderName} 선수! 결승선 통과!`,
    isCloseRace
      ? "정말 아슬아슬합니다! 사진 판독이 필요할 정도로 접전이에요!"
      : `${leaderName} 선수 당당히 결승선을 밟습니다!`,
    "6명의 당첨자가 곧 확정됩니다! 나머지 39명의 운명은!",
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
};
