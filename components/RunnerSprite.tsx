
export interface RunnerFrameSets {
  side: string[];
  back: string[];
  front: string[];
  resting: string[];
}

export const createRunnerFrames = (color: string, id: number): RunnerFrameSets => {
  const frameCount = 12;
  const sets: RunnerFrameSets = { side: [], back: [], front: [], resting: [] };
  
  const skinColor = '#fbd38d';
  const hairColor = '#1a1a1a';
  const pantsColor = '#2d3748';
  const shoeColor = '#ffffff';

  const drawNumber = (ctx: CanvasRenderingContext2D, x: number, y: number, bob: number, scale: number = 1, forceColor?: string) => {
    ctx.fillStyle = forceColor || '#ffffff';
    ctx.font = `bold ${20 * scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 4 * scale;
    ctx.strokeText(id.toString(), x, y + bob);
    ctx.fillText(id.toString(), x, y + bob);
  };

  const drawSideFrame = (f: number) => {
    // SSR / 서버 환경에서 document 가 없어도 빌드가 깨지지 않도록 방어
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const phase = f / frameCount;
    ctx.translate(64, 115);
    const isStopped = f === 0;
    const bob = isStopped ? 0 : -Math.abs(Math.sin(phase * Math.PI * 2)) * 8;
    
    drawSideLeg(ctx, isStopped ? 0.3 : phase + 0.5, true, color, pantsColor, skinColor, shoeColor, isStopped);
    drawSideArm(ctx, isStopped ? 0.3 : phase + 0.5, true, skinColor, isStopped, bob);
    
    ctx.fillStyle = color;
    ctx.fillRect(-9, -65 + bob, 18, 34);
    
    drawNumber(ctx, 0, -48, bob);
    
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.arc(3, -78 + bob, 10, 0, Math.PI * 2); ctx.fill();
    
    drawSideLeg(ctx, isStopped ? 0.7 : phase, false, color, pantsColor, skinColor, shoeColor, isStopped);
    drawSideArm(ctx, isStopped ? 0.7 : phase, false, skinColor, isStopped, bob);
    
    return canvas.toDataURL();
  };

  const drawBackFrame = (f: number) => {
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const phase = f / frameCount;
    ctx.translate(64, 115);
    const isStopped = f === 0;
    const bob = isStopped ? 0 : -Math.abs(Math.sin(phase * Math.PI * 2)) * 6;

    drawBackLeg(ctx, phase + 0.5, true, color, pantsColor, skinColor, isStopped);
    drawBackLeg(ctx, phase, false, color, pantsColor, skinColor, isStopped);
    
    ctx.fillStyle = color;
    ctx.fillRect(-12, -65 + bob, 24, 34);
    
    drawNumber(ctx, 0, -48, bob);
    
    ctx.fillStyle = hairColor;
    ctx.beginPath(); ctx.arc(0, -78 + bob, 10, 0, Math.PI * 2); ctx.fill();
    
    drawStraightArm(ctx, phase, false, skinColor, isStopped, bob);
    drawStraightArm(ctx, phase + 0.5, true, skinColor, isStopped, bob);

    return canvas.toDataURL();
  };

  const drawFrontFrame = (f: number) => {
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const phase = f / frameCount;
    ctx.translate(64, 115);
    const isStopped = f === 0;
    const bob = isStopped ? 0 : -Math.abs(Math.sin(phase * Math.PI * 2)) * 6;

    // Front legs
    drawBackLeg(ctx, phase + 0.5, true, color, pantsColor, skinColor, isStopped);
    drawBackLeg(ctx, phase, false, color, pantsColor, skinColor, isStopped);
    
    ctx.fillStyle = color;
    ctx.fillRect(-12, -65 + bob, 24, 34);
    
    // Front face (bright face)
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.arc(0, -78 + bob, 10, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(-4, -80 + bob, 2, 2);
    ctx.fillRect(2, -80 + bob, 2, 2);
    // Smile
    ctx.strokeStyle = '#c53030';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, -74 + bob, 4, 0.2, Math.PI - 0.2); ctx.stroke();

    drawNumber(ctx, 0, -48, bob, 0.8, '#000');
    
    drawStraightArm(ctx, phase, false, skinColor, isStopped, bob);
    drawStraightArm(ctx, phase + 0.5, true, skinColor, isStopped, bob);

    return canvas.toDataURL();
  };

  const drawStandingFrame = () => {
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.translate(64, 115);
    
    ctx.fillStyle = pantsColor;
    ctx.fillRect(-8, -35, 6, 18);
    ctx.fillRect(2, -35, 6, 18);
    ctx.fillStyle = skinColor;
    ctx.fillRect(-8, -17, 6, 17);
    ctx.fillRect(2, -17, 6, 17);
    
    ctx.fillStyle = color;
    ctx.fillRect(-10, -65, 20, 32);
    
    drawNumber(ctx, 0, -50, 0, 0.9);
    
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.arc(0, -74, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillRect(-3, -76, 2, 2); ctx.fillRect(1, -76, 2, 2);
    
    ctx.fillStyle = skinColor;
    ctx.fillRect(-13, -55, 4, 20);
    ctx.fillRect(9, -55, 4, 20);
    
    return canvas.toDataURL();
  };

  for (let i = 0; i < frameCount; i++) {
    sets.side.push(drawSideFrame(i));
    sets.back.push(drawBackFrame(i));
    sets.front.push(drawFrontFrame(i));
  }
  sets.resting.push(drawStandingFrame());
  return sets;
};

const drawSideLeg = (ctx: CanvasRenderingContext2D, p: number, isFar: boolean, color: string, pants: string, skin: string, shoe: string, isStopped: boolean) => {
  const s = Math.sin(p * Math.PI * 2);
  ctx.save();
  ctx.translate(0, -35);
  ctx.rotate(isStopped ? (isFar ? 0.15 : -0.15) : s * 0.8);
  ctx.fillStyle = isFar ? '#1a202c' : pants;
  ctx.fillRect(-5, 0, 10, 18);
  ctx.translate(0, 16);
  ctx.rotate(isStopped ? 0.05 : (s > 0 ? s * 1.2 : s * 0.4));
  ctx.fillStyle = isFar ? '#d69e2e' : skin;
  ctx.fillRect(-4, 0, 8, 18);
  ctx.fillStyle = shoe;
  ctx.fillRect(-4, 16, 16, 6);
  ctx.restore();
};

const drawSideArm = (ctx: CanvasRenderingContext2D, p: number, isFar: boolean, skin: string, isStopped: boolean, bob: number) => {
  const s = Math.sin(p * Math.PI * 2);
  ctx.save();
  ctx.translate(0, -60 + bob);
  ctx.rotate(isStopped ? (isFar ? -0.1 : 0.1) : -s * 1.0);
  ctx.fillStyle = isFar ? '#975a16' : skin;
  ctx.fillRect(-3, 0, 6, 18); 
  ctx.translate(0, 16);
  ctx.rotate(-1.2);
  ctx.fillRect(-3, 0, 6, 15); 
  ctx.restore();
};

const drawBackLeg = (ctx: CanvasRenderingContext2D, p: number, isFar: boolean, color: string, pants: string, skin: string, isStopped: boolean) => {
  const s = Math.sin(p * Math.PI * 2);
  const lift = isStopped ? 0 : Math.max(0, s) * 12;
  ctx.save();
  ctx.fillStyle = isFar ? '#1a202c' : pants;
  ctx.fillRect(isFar ? -10 : 2, -35 - lift, 8, 18);
  ctx.fillStyle = isFar ? '#d69e2e' : skin;
  ctx.fillRect(isFar ? -10 : 2, -18 - lift, 8, 18);
  ctx.restore();
};

const drawStraightArm = (ctx: CanvasRenderingContext2D, p: number, isLeft: boolean, skin: string, isStopped: boolean, bob: number) => {
  const s = Math.sin(p * Math.PI * 2);
  const swingAngle = isStopped ? 0 : s * 0.2;
  const dynamicLen = isStopped ? 24 : 24 + Math.abs(s) * 10;
  
  ctx.save();
  ctx.translate(isLeft ? -13 : 13, -60 + bob);
  ctx.rotate(isLeft ? swingAngle : -swingAngle);
  ctx.fillStyle = isLeft ? '#975a16' : skin;
  ctx.fillRect(-3, 0, 6, dynamicLen);
  ctx.restore();
};
