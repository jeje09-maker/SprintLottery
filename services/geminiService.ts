
import { GoogleGenAI } from "@google/genai";

export const generateRunnerNames = async (count: number): Promise<string[]> => {
  return Array.from({ length: count }, (_, i) => `Athlete ${i + 1}`);
};

/**
 * Generates dynamic, high-energy race commentary based on current runner progress.
 * Includes fallback logic for API quota exhaustion (429).
 */
export const getRaceCommentary = async (runners: any[], status: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "경기가 뜨겁게 달아오르고 있습니다!";

  const ai = new GoogleGenAI({ apiKey });
  
  const sorted = [...runners].sort((a, b) => b.progress - a.progress);
  const leader = sorted[0];
  const runnerCount = runners.length;
  
  const prompt = `You are a world-class stadium sports commentator narrating a live race. 
  Race Status: ${status}
  Runners on track: ${runnerCount}
  Current leader: Athlete ${leader?.id} with ${Math.round((leader?.progress || 0) * 100)}% of the course completed.
  
  Provide a short, intense, and exciting one-sentence commentary in Korean.
  The commentary should feel live and immediate. Do not include English.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || "레이스가 절정에 달하고 있습니다!";
  } catch (error: any) {
    // 429 Resource Exhausted 또는 기타 API 오류 시 기본 메시지 반환
    console.warn("Gemini Commentary Quota/Error:", error?.message || error);
    
    const fallbacks = [
      "선수들이 마지막 스퍼트를 올리고 있습니다!",
      "관중석의 함성이 경기장을 가득 채웁니다!",
      "치열한 선두 다툼이 이어지고 있습니다!",
      "역전에 역전! 한 치 앞을 알 수 없는 승부입니다!",
      "결승선이 보이기 시작합니다!"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
};
