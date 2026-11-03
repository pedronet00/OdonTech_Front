import { useEffect, useRef, useState } from 'react';
import { Crosshair, Eye, X } from 'lucide-react';
import { describeTooth, parseFdi } from './toothNotation';
import { createDentalScene, type DentalScene } from './dentalScene';
import './ToothViewer.css';

interface ToothViewerModalProps {
  /** Número do dente na notação FDI (ex.: 21). */
  tooth: number;
  onClose: () => void;
}

export default function ToothViewerModal({ tooth, onClose }: ToothViewerModalProps) {
  const info = parseFdi(tooth);
  const stageRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<DentalScene | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRoots, setShowRoots] = useState(true);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !info) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let scene: DentalScene;
    try {
      scene = createDentalScene(stage, {
        highlight: info,
        reducedMotion,
        onPin: (x, y, visible) => {
          const pin = pinRef.current;
          if (!pin) return;
          pin.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
          pin.style.opacity = visible ? '1' : '0';
        },
        onHover: (hovered, x, y) => {
          const tip = tipRef.current;
          if (!tip) return;
          if (!hovered || hovered.fdi === info.fdi) { tip.style.opacity = '0'; return; }
          tip.textContent = `${hovered.fdi} · ${describeTooth(hovered)}`;
          tip.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
          tip.style.opacity = '1';
        },
      });
    } catch (err) {
      console.error('Falha ao iniciar o visualizador 3D', err);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- falha ao criar o contexto WebGL só é conhecida aqui
      setError('Não foi possível abrir o modelo 3D neste navegador (WebGL indisponível).');
      return;
    }
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // O modelo é montado uma vez por dente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooth]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleRoots = (visible: boolean) => {
    setShowRoots(visible);
    sceneRef.current?.setRootsVisible(visible);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content tv-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="tv-title">
        <div className="modal-header">
          <div className="tv-heading">
            <span className="tv-number" aria-hidden="true">{tooth}</span>
            <div>
              <h2 id="tv-title">
                {info ? describeTooth(info) : `Dente ${tooth}`}
                {info?.deciduous && <span className="tv-tag">Decíduo</span>}
              </h2>
              <p className="tv-sub">
                {info ? `Dente ${tooth} na notação FDI` : 'Número de dente inválido'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="action-btn" aria-label="Fechar">
            <X size={24} />
          </button>
        </div>

        {!info ? (
          <div className="tv-message">
            O número <strong>{tooth}</strong> não corresponde a um dente na notação FDI.
            Use dois dígitos: o quadrante (1–4 permanentes, 5–8 decíduos) e a posição a partir da linha média (ex.: 11, 36, 48, 55).
          </div>
        ) : error ? (
          <div className="tv-message">{error}</div>
        ) : (
          <>
            <div className="tv-stage" ref={stageRef}>
              <div className="tv-pin" ref={pinRef} aria-hidden="true">{tooth}</div>
              <div className="tv-tooltip" ref={tipRef} aria-hidden="true" />

              <div className="tv-toolbar">
                <button type="button" className="tv-btn" onClick={() => sceneRef.current?.focusTooth()}>
                  <Crosshair size={15} /> Focar no dente
                </button>
                <button type="button" className="tv-btn" onClick={() => sceneRef.current?.frontView()}>
                  <Eye size={15} /> Vista frontal
                </button>
                <label className="tv-check">
                  <input type="checkbox" checked={showRoots} onChange={e => toggleRoots(e.target.checked)} />
                  Mostrar raízes
                </label>
              </div>
              <p className="tv-hint">Arraste para girar · role para aproximar</p>
            </div>
            <p className="tv-note">
              Vista do dentista, de frente para o paciente: o lado direito do paciente aparece à esquerda.
              {info.deciduous && ' O dente decíduo é mostrado na posição correspondente da arcada permanente.'}
              {' '}Modelo ilustrativo, sem as medidas reais do paciente.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
