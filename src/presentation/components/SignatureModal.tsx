import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Eraser, PenLine } from 'lucide-react';
import './SignatureModal.css';

interface SignatureModalProps {
  title?: string;
  signerName?: string;
  children?: React.ReactNode;
  isSaving?: boolean;
  onCancel: () => void;
  onConfirm: (assinaturaBase64: string) => void;
}

export function SignatureModal({ title = 'Assinatura do Paciente', signerName, children, isSaving, onCancel, onConfirm }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Ajusta a resolução interna do canvas ao tamanho exibido (e ao devicePixelRatio),
  // senão o traço fica borrado em telas retina e desalinhado do ponteiro.
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    setIsEmpty(true);
  }, []);

  useEffect(() => {
    setupCanvas();
    // Redimensionar apaga o canvas; só acontece ao girar o tablet ou mudar a janela.
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isSaving) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const point = getPoint(e);
    lastPointRef.current = point;

    // Desenha um ponto, para que um toque simples também apareça
    const ctx = e.currentTarget.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }
    setIsEmpty(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastPointRef.current) return;
    e.preventDefault();
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;

    const point = getPoint(e);
    const last = lastPointRef.current;
    const mid = { x: (last.x + point.x) / 2, y: (last.y + point.y) / 2 };

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastPointRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    onConfirm(canvas.toDataURL('image/png'));
  };

  return (
    <div className="modal-overlay" onClick={() => !isSaving && onCancel()}>
      <div className="modal-content signature-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onCancel} className="action-btn" disabled={isSaving}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {children}

          <div className="signature-pad-wrapper">
            <canvas
              ref={canvasRef}
              className="signature-pad-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            {isEmpty && (
              <div className="signature-pad-placeholder">
                <PenLine size={20} />
                Assine aqui com o dedo ou o mouse
              </div>
            )}
            <div className="signature-pad-baseline" />
            {signerName && <div className="signature-pad-name">{signerName}</div>}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-secondary" onClick={handleClear} disabled={isEmpty || isSaving}>
            <Eraser size={16} /> Limpar
          </button>
          <div className="flex-row gap-3 signature-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={isEmpty || isSaving}>
              {isSaving ? 'Salvando...' : 'Confirmar Assinatura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
