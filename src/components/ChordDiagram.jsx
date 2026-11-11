import React from 'react';
import { getChordDiagramData } from '../utils/chordDictionary';

/**
 * Renderiza o diagrama visual do acorde no braço do violão (6 cordas, 4 casas) em SVG limpo.
 */
export default function ChordDiagram({ chord, size = 'md' }) {
  const data = getChordDiagramData(chord);
  if (!data) return null;

  const { frets, fingers = [], barres = [], baseFret = 1 } = data;
  const numStrings = 6;
  const numFrets = 4;

  const width = size === 'lg' ? 130 : 96;
  const height = size === 'lg' ? 155 : 118;
  const padLeft = size === 'lg' ? 24 : 18;
  const padRight = size === 'lg' ? 16 : 12;
  const padTop = size === 'lg' ? 34 : 26;
  const padBottom = size === 'lg' ? 18 : 14;

  const gridW = width - padLeft - padRight;
  const gridH = height - padTop - padBottom;
  const stringSpacing = gridW / (numStrings - 1);
  const fretSpacing = gridH / numFrets;
  const dotRadius = size === 'lg' ? 7.5 : 5.8;

  const getStringX = (stringIndex) => padLeft + stringIndex * stringSpacing;
  const getFretY = (relativeFret) =>
    padTop + (relativeFret - 0.5) * fretSpacing;

  return (
    <div className="inline-flex flex-col items-center bg-zinc-950/90 border border-zinc-800 rounded-2xl p-2 shadow-md select-none shrink-0">
      <span
        className={`font-mono font-extrabold text-amber-400 leading-tight ${
          size === 'lg' ? 'text-base mb-0.5' : 'text-xs'
        }`}
      >
        {chord}
      </span>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Pestana superior (Nut) se baseFret === 1 */}
        {baseFret === 1 ? (
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft + gridW}
            y2={padTop}
            stroke="#f4f4f5"
            strokeWidth={size === 'lg' ? 4 : 3}
            strokeLinecap="round"
          />
        ) : (
          <text
            x={padLeft - (size === 'lg' ? 8 : 6)}
            y={padTop + fretSpacing * 0.65}
            textAnchor="end"
            fill="#f59e0b"
            fontSize={size === 'lg' ? '11' : '9'}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {baseFret}ª
          </text>
        )}

        {/* Linhas horizontais dos trastes (casas) */}
        {Array.from({ length: numFrets + 1 }).map((_, fIdx) => (
          <line
            key={`fret-${fIdx}`}
            x1={padLeft}
            y1={padTop + fIdx * fretSpacing}
            x2={padLeft + gridW}
            y2={padTop + fIdx * fretSpacing}
            stroke="#52525b"
            strokeWidth={1.2}
          />
        ))}

        {/* Linhas verticais das 6 cordas (da 6ª corda E grave até a 1ª corda e aguda) */}
        {Array.from({ length: numStrings }).map((_, sIdx) => (
          <line
            key={`string-${sIdx}`}
            x1={getStringX(sIdx)}
            y1={padTop}
            x2={getStringX(sIdx)}
            y2={padTop + gridH}
            stroke="#71717a"
            strokeWidth={sIdx < 3 ? 1.5 : 1}
          />
        ))}

        {/* Símbolos de Corda Solta (O) ou Não Tocada (X) no topo */}
        {frets.map((fret, sIdx) => {
          const x = getStringX(sIdx);
          const y = padTop - (size === 'lg' ? 10 : 8);

          if (fret === -1) {
            return (
              <text
                key={`mute-${sIdx}`}
                x={x}
                y={y}
                textAnchor="middle"
                fill="#ef4444"
                fontSize={size === 'lg' ? '11' : '9'}
                fontWeight="bold"
              >
                ×
              </text>
            );
          }

          if (fret === 0) {
            return (
              <circle
                key={`open-${sIdx}`}
                cx={x}
                cy={y - 3}
                r={size === 'lg' ? 3.5 : 2.8}
                fill="none"
                stroke="#a1a1aa"
                strokeWidth={1.5}
              />
            );
          }

          return null;
        })}

        {/* Pestanas (Barres) */}
        {barres.map((barre, bIdx) => {
          const relFret = barre.fret - baseFret + 1;
          if (relFret < 1 || relFret > numFrets) return null;
          // Convertendo corda 6..1 para índice 0..5
          const startIdx = 6 - barre.fromString;
          const endIdx = 6 - barre.toString;
          const x1 = getStringX(Math.min(startIdx, endIdx));
          const x2 = getStringX(Math.max(startIdx, endIdx));
          const y = getFretY(relFret);

          return (
            <line
              key={`barre-${bIdx}`}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke="#f59e0b"
              strokeWidth={dotRadius * 1.65}
              strokeLinecap="round"
            />
          );
        })}

        {/* Bolinhas das notas pressionadas + Número do Dedo */}
        {frets.map((fret, sIdx) => {
          if (fret <= 0) return null;
          const relFret = fret - baseFret + 1;
          if (relFret < 1 || relFret > numFrets) return null;

          const cx = getStringX(sIdx);
          const cy = getFretY(relFret);
          const finger = fingers[sIdx];

          return (
            <g key={`note-${sIdx}`}>
              <circle
                cx={cx}
                cy={cy}
                r={dotRadius}
                fill="#f59e0b"
                stroke="#09090b"
                strokeWidth={1}
              />
              {finger > 0 && (
                <text
                  x={cx}
                  y={cy + (size === 'lg' ? 3.5 : 2.8)}
                  textAnchor="middle"
                  fill="#09090b"
                  fontSize={size === 'lg' ? '10' : '8'}
                  fontWeight="800"
                  fontFamily="sans-serif"
                >
                  {finger}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

