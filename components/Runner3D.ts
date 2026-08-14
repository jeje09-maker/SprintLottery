import * as THREE from 'three';

export interface Runner3DModel {
  group: THREE.Group;
  updateAnimation: (time: number, speed: number, isResting: boolean, curveLean: number, isFallen?: boolean) => void;
}

export const createRunner3D = (shirtColorHex: string, id: number, name?: string): Runner3DModel => {
  const group = new THREE.Group();
  
  // Materials
  const skin = new THREE.MeshStandardMaterial({ color: 0xfbd38d, roughness: 0.6 });
  const shirt = new THREE.MeshStandardMaterial({ color: shirtColorHex, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.9 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0 });

  // Geometry Sizes
  const torsoW = 3, torsoH = 5, torsoD = 2;
  const headS = 2.5;
  const upperLimbW = 1.0, upperLimbH = 3.2, upperLimbD = 1.0;
  const lowerLimbW = 0.9, lowerLimbH = 3.2, lowerLimbD = 0.9;
  
  // Torso Joint
  const torsoJoint = new THREE.Group();
  group.add(torsoJoint);

  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(torsoW, torsoH, torsoD), shirt);
  torsoMesh.position.y = torsoH / 2;
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torsoJoint.add(torsoMesh);

  // Jersey Number Badge
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = shirtColorHex; ctx.fillRect(0,0,128,128);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 58px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(id.toString(), 64, 64);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.strokeText(id.toString(), 64, 64);
  }
  const numTex = new THREE.CanvasTexture(canvas);
  numTex.colorSpace = THREE.SRGBColorSpace;
  const numMat = new THREE.MeshStandardMaterial({ map: numTex, roughness: 0.9, transparent: true, alphaTest: 0.1 });
  
  const torsoFront = new THREE.Mesh(new THREE.PlaneGeometry(torsoW*0.8, torsoW*0.8), numMat);
  torsoFront.position.set(0, torsoH/2, torsoD/2 + 0.1);
  const torsoBack = new THREE.Mesh(new THREE.PlaneGeometry(torsoW*0.8, torsoW*0.8), numMat);
  torsoBack.rotation.y = Math.PI;
  torsoBack.position.set(0, torsoH/2, -torsoD/2 - 0.1);
  torsoJoint.add(torsoFront, torsoBack);

  // Floating 3D Name Tag Sprite above head
  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = 256;
  nameCanvas.height = 64;
  const nameCtx = nameCanvas.getContext('2d');
  if (nameCtx) {
    nameCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    nameCtx.roundRect(4, 4, 248, 56, 16);
    nameCtx.fill();
    nameCtx.strokeStyle = shirtColorHex;
    nameCtx.lineWidth = 4;
    nameCtx.roundRect(4, 4, 248, 56, 16);
    nameCtx.stroke();
    nameCtx.fillStyle = '#ffffff';
    nameCtx.font = 'bold 26px sans-serif';
    nameCtx.textAlign = 'center';
    nameCtx.textBaseline = 'middle';
    const displayName = name ? `${id}. ${name}` : `${id}`;
    nameCtx.fillText(displayName.length > 9 ? displayName.slice(0, 8) + '\u2026' : displayName, 128, 32);
  }
  const nameTexture = new THREE.CanvasTexture(nameCanvas);
  nameTexture.colorSpace = THREE.SRGBColorSpace;
  const nameSpriteMat = new THREE.SpriteMaterial({ map: nameTexture, depthTest: false });
  const nameSprite = new THREE.Sprite(nameSpriteMat);
  nameSprite.scale.set(6.5, 1.6, 1);
  nameSprite.position.set(0, 11, 0);
  group.add(nameSprite);

  // Head
  const headJoint = new THREE.Group();
  headJoint.position.set(0, torsoH + headS/2 - 0.2, 0);
  torsoJoint.add(headJoint);
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(headS/2, 16, 16), skin);
  headMesh.castShadow = true;
  headJoint.add(headMesh);
  const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(headS*1.05, headS*0.3, headS*1.05), hair);
  hairMesh.position.y = headS/2 - 0.05;
  headJoint.add(hairMesh);

  // Create limb helper
  const createLimb = (isLeg: boolean, mat1: THREE.Material, mat2: THREE.Material) => {
    const joint = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.BoxGeometry(upperLimbW, upperLimbH, upperLimbD), mat1);
    upper.position.y = -upperLimbH / 2;
    upper.castShadow = true;
    joint.add(upper);
    
    const elbowKnee = new THREE.Group();
    elbowKnee.position.y = -upperLimbH + 0.2;
    joint.add(elbowKnee);
    
    const lower = new THREE.Mesh(new THREE.BoxGeometry(lowerLimbW, lowerLimbH, lowerLimbD), mat2);
    lower.position.y = -lowerLimbH / 2;
    lower.castShadow = true;
    elbowKnee.add(lower);

    if (isLeg) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(lowerLimbW*1.2, 1, lowerLimbD*1.8), shoe);
      foot.position.set(0, -lowerLimbH - 0.5, lowerLimbD/2 - 0.2);
      foot.castShadow = true;
      elbowKnee.add(foot);
    }
    
    return { root: joint, lower: elbowKnee };
  };

  // Arms
  const leftArm = createLimb(false, skin, skin);
  leftArm.root.position.set(torsoW/2 + upperLimbW/2 + 0.1, torsoH - 0.5, 0);
  torsoJoint.add(leftArm.root);

  const rightArm = createLimb(false, skin, skin);
  rightArm.root.position.set(-torsoW/2 - upperLimbW/2 - 0.1, torsoH - 0.5, 0);
  torsoJoint.add(rightArm.root);

  // Legs
  const leftLeg = createLimb(true, pants, skin);
  leftLeg.root.position.set(torsoW/2 - upperLimbW/2 - 0.1, 0, 0);
  torsoJoint.add(leftLeg.root);

  const rightLeg = createLimb(true, pants, skin);
  rightLeg.root.position.set(-torsoW/2 + upperLimbW/2 + 0.1, 0, 0);
  torsoJoint.add(rightLeg.root);

  const animVariation = 0.85 + Math.random() * 0.3;
  const legTotalH = upperLimbH + lowerLimbH;
  torsoJoint.position.y = legTotalH;

  const updateAnimation = (time: number, speed: number, isResting: boolean, curveLean: number, isFallen?: boolean) => {
    if (isFallen) {
      // Fallen on the track animation
      torsoJoint.position.y = 1.0;
      torsoJoint.rotation.set(Math.PI / 2.05, 0, 0.35);
      headJoint.rotation.set(-0.2, 0.4, 0);
      leftArm.root.rotation.set(0.6, 0, -1.1);
      rightArm.root.rotation.set(0.6, 0, 1.1);
      leftArm.lower.rotation.set(0.2, 0, 0);
      rightArm.lower.rotation.set(0.2, 0, 0);
      leftLeg.root.rotation.set(-0.2, 0, -0.3);
      rightLeg.root.rotation.set(-0.2, 0, 0.3);
      leftLeg.lower.rotation.set(0.2, 0, 0);
      rightLeg.lower.rotation.set(0.2, 0, 0);
      nameSprite.position.set(0, 3.5, 0);
      return;
    }

    nameSprite.position.set(0, 11, 0);

    if (isResting) {
      leftArm.root.rotation.set(0, 0, 0.1); rightArm.root.rotation.set(0, 0, -0.1);
      leftArm.lower.rotation.set(-0.1, 0, 0); rightArm.lower.rotation.set(-0.1, 0, 0);
      leftLeg.root.rotation.set(0, 0, 0.1); rightLeg.root.rotation.set(0, 0, -0.1);
      leftLeg.lower.rotation.set(0, 0, 0); rightLeg.lower.rotation.set(0, 0, 0);
      torsoJoint.rotation.set(0, 0, 0);
      torsoJoint.position.y = legTotalH;
    } else {
      const cycle = time * 15.0 * animVariation; 
      const legPhase = Math.sin(cycle);
      const legPhaseCos = Math.cos(cycle);
      
      leftLeg.root.rotation.x = legPhase * 1.2;
      leftLeg.root.rotation.z = 0;
      rightLeg.root.rotation.x = -legPhase * 1.2;
      rightLeg.root.rotation.z = 0;
      
      leftLeg.lower.rotation.x = -Math.max(0, legPhaseCos * 1.8 + 0.2);
      rightLeg.lower.rotation.x = -Math.max(0, -legPhaseCos * 1.8 + 0.2);

      leftArm.root.rotation.x = -legPhase * 1.2;
      leftArm.root.rotation.z = 0.2;
      rightArm.root.rotation.x = legPhase * 1.2;
      rightArm.root.rotation.z = -0.2;
      
      leftArm.lower.rotation.x = 1.0 + (leftArm.root.rotation.x > 0 ? leftArm.root.rotation.x * 0.5 : 0);
      rightArm.lower.rotation.x = 1.0 + (rightArm.root.rotation.x > 0 ? rightArm.root.rotation.x * 0.5 : 0);
      
      const bob = Math.abs(Math.sin(cycle * 2)) * 0.8;
      torsoJoint.position.y = legTotalH - bob + 0.5;
      
      const forwardLean = 0.25; 
      torsoJoint.rotation.x = forwardLean;
      torsoJoint.rotation.z = curveLean * -0.5;
      
      headJoint.rotation.x = -forwardLean;
      headJoint.rotation.z = -torsoJoint.rotation.z;
    }
  };

  return {
    group,
    updateAnimation
  };
};
