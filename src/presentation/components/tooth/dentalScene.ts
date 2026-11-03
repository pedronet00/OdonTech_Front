import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PERMANENT_TEETH, parseFdi, type ToothInfo } from './toothNotation';

/*
 * Arcada dentária procedural, em milímetros aproximados.
 * Eixos da cena: X = lado (esquerdo do paciente em +X, como o dentista vê de frente),
 * Y = vertical (plano oclusal em y = 0, arcada superior acima), Z = frente (+Z, voltado para a câmera).
 * Cada dente é montado em coordenadas locais: X = mesiodistal, Z = vestíbulo-lingual, Y = altura,
 * com a borda oclusal em y = 0 e a raiz para +Y (orientação de um dente superior).
 */

interface ToothDims { w: number; d: number; h: number; root: number; roots: number }

// Larguras mesiodistais médias (mm), da posição 1 (incisivo central) à 8 (siso).
const UPPER: ToothDims[] = [
  { w: 8.6, d: 7.0, h: 10.5, root: 13, roots: 1 },
  { w: 6.6, d: 6.2, h: 9.0, root: 13, roots: 1 },
  { w: 7.6, d: 8.0, h: 10.0, root: 17, roots: 1 },
  { w: 7.0, d: 9.0, h: 8.5, root: 14, roots: 2 },
  { w: 6.6, d: 9.0, h: 8.0, root: 14, roots: 1 },
  { w: 10.2, d: 11.0, h: 7.5, root: 12.5, roots: 3 },
  { w: 9.2, d: 11.0, h: 7.0, root: 12, roots: 3 },
  { w: 8.6, d: 10.0, h: 6.5, root: 11, roots: 3 },
];

const LOWER: ToothDims[] = [
  { w: 5.2, d: 5.8, h: 9.0, root: 12.5, roots: 1 },
  { w: 5.8, d: 6.2, h: 9.5, root: 14, roots: 1 },
  { w: 6.8, d: 7.6, h: 11.0, root: 16, roots: 1 },
  { w: 7.0, d: 7.8, h: 8.5, root: 14, roots: 1 },
  { w: 7.1, d: 8.2, h: 8.0, root: 14.5, roots: 1 },
  { w: 11.2, d: 10.5, h: 7.5, root: 14, roots: 2 },
  { w: 10.5, d: 10.0, h: 7.0, root: 13, roots: 2 },
  { w: 10.0, d: 9.5, h: 6.5, root: 11, roots: 2 },
];

// Meia arcada (lado esquerdo do paciente, +X), da linha média até atrás do siso.
const UPPER_PATH = [[0, 0], [8, -1.5], [15, -5], [20, -11], [23.5, -18], [26, -27], [27.5, -37], [28.5, -48], [29, -60]];
const LOWER_PATH = [[0, 0], [6.5, -1], [12.5, -4], [17, -9], [20.5, -16], [23, -25], [24.5, -35], [25.5, -46], [26, -58]];

/** Folga vertical entre as arcadas no plano oclusal. */
const BITE_GAP = 0.8;
const ARCH_TARGET = new THREE.Vector3(0, 0, -24);

const COLORS = {
  enamel: 0xf2ead8,
  root: 0xe2cfaa,
  gum: 0xd9858f,
  highlight: 0x38bdf8,
  highlightGlow: 0x0284c7,
  hover: 0xfff5d6,
};

interface ToothNode {
  info: ToothInfo;
  group: THREE.Group;
  meshes: THREE.Mesh[];
  /** Onde fica o marcador: logo além da gengiva, no sentido da raiz. */
  pin: THREE.Vector3;
  center: THREE.Vector3;
}

/** Estreita a coroa de acordo com o tipo de dente (borda incisal fina, canino pontudo, colo mais estreito). */
function shapeCrown(geo: THREE.BufferGeometry, position: number, h: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = 1 - THREE.MathUtils.clamp(y / h, 0, 1); // 1 na borda oclusal, 0 no colo
    let sx: number, sz: number;
    if (position <= 2) { sx = 1; sz = THREE.MathUtils.lerp(1, 0.35, t * t); }
    else if (position === 3) { const k = Math.pow(t, 1.6); sx = THREE.MathUtils.lerp(1, 0.45, k); sz = THREE.MathUtils.lerp(1, 0.6, k); }
    else { const neck = 1 - t; sx = THREE.MathUtils.lerp(1, 0.82, neck * neck); sz = sx; }
    pos.setX(i, pos.getX(i) * sx);
    pos.setZ(i, pos.getZ(i) * sz);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function buildTooth(dims: ToothDims, position: number, enamel: THREE.Material, rootMat: THREE.Material) {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  const radius = Math.min(dims.w, dims.d, dims.h) * (position <= 2 ? 0.18 : 0.3);
  const crownGeo = new RoundedBoxGeometry(dims.w, dims.h, dims.d, 4, radius);
  crownGeo.translate(0, dims.h / 2, 0);
  shapeCrown(crownGeo, position, dims.h);
  const crown = new THREE.Mesh(crownGeo, enamel);
  meshes.push(crown);
  group.add(crown);

  // Raízes: cones com a ponta para +Y, distribuídos sob a coroa.
  const offsets: [number, number][] =
    dims.roots === 3 ? [[-dims.w * 0.22, dims.d * 0.18], [dims.w * 0.22, dims.d * 0.18], [0, -dims.d * 0.22]]
    : dims.roots === 2 ? (position === 4 ? [[0, dims.d * 0.2], [0, -dims.d * 0.2]] : [[-dims.w * 0.24, 0], [dims.w * 0.24, 0]])
    : [[0, 0]];
  const rootRadius = Math.min(dims.w, dims.d) * (dims.roots === 1 ? 0.34 : 0.22);
  for (const [ox, oz] of offsets) {
    const rootGeo = new THREE.ConeGeometry(rootRadius, dims.root, 16, 1, true);
    rootGeo.translate(ox, dims.h + dims.root / 2 - 0.6, oz);
    const root = new THREE.Mesh(rootGeo, rootMat);
    meshes.push(root);
    group.add(root);
  }

  return { group, meshes };
}

function archCurve(path: number[][], side: 1 | -1, y: number) {
  return new THREE.CatmullRomCurve3(path.map(([x, z]) => new THREE.Vector3(x * side, y, z)), false, 'centripetal');
}

export interface DentalSceneOptions {
  highlight: ToothInfo;
  onHover: (tooth: ToothInfo | null, x: number, y: number) => void;
  /** Recebe a posição em pixels do marcador do dente destacado (ou null se estiver atrás da câmera). */
  onPin: (x: number, y: number, visible: boolean) => void;
  reducedMotion: boolean;
}

export interface DentalScene {
  focusTooth: () => void;
  frontView: () => void;
  setRootsVisible: (visible: boolean) => void;
  dispose: () => void;
}

export function createDentalScene(container: HTMLElement, opts: DentalSceneOptions): DentalScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 1000);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(40, 60, 90);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfdbfe, 0.6);
  rim.position.set(-60, -40, -60);
  scene.add(rim);

  const enamel = new THREE.MeshStandardMaterial({ color: COLORS.enamel, roughness: 0.35, metalness: 0.02 });
  const rootMat = new THREE.MeshStandardMaterial({ color: COLORS.root, roughness: 0.7 });
  const hoverMat = new THREE.MeshStandardMaterial({ color: COLORS.hover, roughness: 0.3, emissive: 0x6b5a2a, emissiveIntensity: 0.25 });
  const highlightMat = new THREE.MeshStandardMaterial({ color: COLORS.highlight, roughness: 0.3, emissive: COLORS.highlightGlow, emissiveIntensity: 0.5 });
  const highlightRootMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.6, emissive: COLORS.highlightGlow, emissiveIntensity: 0.25 });
  const gumMat = new THREE.MeshStandardMaterial({ color: COLORS.gum, roughness: 0.8, transparent: true, opacity: 0.55, depthWrite: false });
  const materials: THREE.Material[] = [enamel, rootMat, hoverMat, highlightMat, highlightRootMat, gumMat];

  const teeth = new Map<number, ToothNode>();
  const pickables: THREE.Mesh[] = [];
  const roots: THREE.Mesh[] = [];

  for (const fdi of PERMANENT_TEETH) {
    const info = parseFdi(fdi)!;
    const upper = info.arch === 'superior';
    const dims = (upper ? UPPER : LOWER)[info.position - 1];
    const sideSign: 1 | -1 = info.side === 'esquerdo' ? 1 : -1;
    const curve = archCurve(upper ? UPPER_PATH : LOWER_PATH, sideSign, 0);

    // Centro do dente ao longo da curva, somando as larguras dos dentes anteriores.
    const widths = (upper ? UPPER : LOWER).map(t => t.w + 0.25);
    const s = widths.slice(0, info.position - 1).reduce((a, b) => a + b, 0) + widths[info.position - 1] / 2;
    const u = Math.min(s / curve.getLength(), 1);
    const point = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u);

    const { group, meshes } = buildTooth(dims, info.position, enamel, rootMat);
    meshes.forEach((m, i) => {
      m.userData.fdi = fdi;
      m.userData.isRoot = i > 0;
      pickables.push(m);
      if (i > 0) roots.push(m);
    });

    // Alinha o eixo mesiodistal à curva; a arcada inferior é girada 180° em X (oclusal para cima).
    const yaw = Math.atan2(-tangent.z, tangent.x);
    if (upper) {
      group.rotation.set(0, yaw, 0);
      group.position.set(point.x, BITE_GAP / 2, point.z);
    } else {
      group.rotation.set(Math.PI, -yaw, 0);
      group.position.set(point.x, -BITE_GAP / 2, point.z);
    }
    scene.add(group);

    const dirY = upper ? 1 : -1;
    const center = group.position.clone().add(new THREE.Vector3(0, dirY * dims.h / 2, 0));
    const pin = group.position.clone().add(new THREE.Vector3(0, dirY * (dims.h + dims.root + 3), 0));
    teeth.set(fdi, { info, group, meshes, pin, center });
  }

  // Gengiva: um tubo translúcido ao longo de cada arcada, na altura do colo dos dentes.
  for (const [path, y] of [[UPPER_PATH, BITE_GAP / 2 + 8.5], [LOWER_PATH, -(BITE_GAP / 2 + 8.5)]] as const) {
    const pts = [
      ...[...path].reverse().map(([x, z]) => new THREE.Vector3(-x, y, z)),
      ...path.slice(1).map(([x, z]) => new THREE.Vector3(x, y, z)),
    ];
    const gumGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 160, 3.2, 14, false);
    const gum = new THREE.Mesh(gumGeo, gumMat);
    gum.renderOrder = 1;
    scene.add(gum);
  }

  const target = teeth.get(opts.highlight.deciduous ? opts.highlight.quadrant * 10 + opts.highlight.position : opts.highlight.fdi)!;
  target.meshes.forEach(m => { m.material = m.userData.isRoot ? highlightRootMat : highlightMat; });

  // Câmera e controles
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 45;
  controls.maxDistance = 260;
  controls.target.copy(ARCH_TARGET);

  /** Vista vestibular do dente destacado, levemente de baixo (superiores) ou de cima (inferiores). */
  const focusPose = () => {
    const dir = new THREE.Vector3(target.center.x - ARCH_TARGET.x, 0, target.center.z - ARCH_TARGET.z).normalize();
    const lookAt = new THREE.Vector3(target.center.x * 0.5, target.center.y * 0.6, (target.center.z + ARCH_TARGET.z) / 2);
    const pos = lookAt.clone().addScaledVector(dir, 105);
    pos.y += target.info.arch === 'superior' ? -22 : 22;
    return { pos, lookAt };
  };
  const frontPose = () => ({ pos: new THREE.Vector3(0, 6, 150), lookAt: ARCH_TARGET.clone() });

  let tween: { fromPos: THREE.Vector3; fromTarget: THREE.Vector3; toPos: THREE.Vector3; toTarget: THREE.Vector3; start: number } | null = null;
  const goTo = ({ pos, lookAt }: { pos: THREE.Vector3; lookAt: THREE.Vector3 }, animate = true) => {
    if (!animate || opts.reducedMotion) {
      camera.position.copy(pos);
      controls.target.copy(lookAt);
      controls.update();
      tween = null;
      return;
    }
    tween = { fromPos: camera.position.clone(), fromTarget: controls.target.clone(), toPos: pos, toTarget: lookAt, start: performance.now() };
  };
  goTo(focusPose(), false);

  // Tamanho
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  // Passar o mouse mostra o número de cada dente
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered: ToothNode | null = null;
  const setHovered = (node: ToothNode | null) => {
    if (hovered === node) return;
    if (hovered && hovered !== target) hovered.meshes.forEach(m => { if (!m.userData.isRoot) m.material = enamel; });
    hovered = node;
    if (hovered && hovered !== target) hovered.meshes.forEach(m => { if (!m.userData.isRoot) m.material = hoverMat; });
  };
  const onPointerMove = (e: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickables, false).find(h => h.object.visible);
    const node = hit ? teeth.get(hit.object.userData.fdi as number) ?? null : null;
    setHovered(node);
    renderer.domElement.style.cursor = node ? 'pointer' : 'grab';
    opts.onHover(node ? node.info : null, e.clientX - rect.left, e.clientY - rect.top);
  };
  const onPointerLeave = () => { setHovered(null); opts.onHover(null, 0, 0); };
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);

  // Loop
  const projected = new THREE.Vector3();
  let rootsVisible = true;
  let frame = 0;
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    if (tween) {
      const k = Math.min((now - tween.start) / 650, 1);
      const e = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
      if (k === 1) tween = null;
    }
    controls.update();
    if (!opts.reducedMotion) highlightMat.emissiveIntensity = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(now / 380));
    renderer.render(scene, camera);

    projected.copy(rootsVisible ? target.pin : target.center.clone().add(new THREE.Vector3(0, target.info.arch === 'superior' ? 12 : -12, 0))).project(camera);
    const rect = renderer.domElement;
    opts.onPin((projected.x * 0.5 + 0.5) * rect.clientWidth, (-projected.y * 0.5 + 0.5) * rect.clientHeight, projected.z < 1);
  };
  frame = requestAnimationFrame(loop);

  return {
    focusTooth: () => goTo(focusPose()),
    frontView: () => goTo(frontPose()),
    setRootsVisible: (visible: boolean) => {
      rootsVisible = visible;
      roots.forEach(r => { r.visible = visible; });
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      controls.dispose();
      scene.traverse(obj => { if (obj instanceof THREE.Mesh) obj.geometry.dispose(); });
      materials.forEach(m => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
