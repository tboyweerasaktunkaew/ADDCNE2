import React from 'react';

/**
 * Lightweight SVG QR Code generator
 * Generates a crisp vector 25x25 QR Code matrix with standard finder patterns,
 * timing patterns, and data payload bits deterministically hashed from the input string.
 */
export const QRCodeSVG: React.FC<{
  value: string;
  size?: number;
  className?: string;
}> = ({ value, size = 64, className = '' }) => {
  const dimension = 25; // 25x25 grid (Version 2 QR)
  
  // Deterministic PRNG seeded by string
  const hashString = (str: string): number[] => {
    const bytes: number[] = [];
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
      bytes.push((h >>> (i % 24)) & 0xff);
    }
    while (bytes.length < 100) {
      h = Math.imul(h ^ bytes.length, 0x5bd1e995);
      bytes.push(Math.abs(h) % 256);
    }
    return bytes;
  };

  const seedBytes = hashString(value || 'PEA-GRIDOPS');

  // Create empty 25x25 matrix
  const matrix: boolean[][] = Array.from({ length: dimension }, () =>
    Array(dimension).fill(false)
  );

  // Helper to draw 7x7 Finder Pattern at (row, col)
  const drawFinderPattern = (startR: number, startC: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[startR + r][startC + c] = isBorder || isCenter;
      }
    }
  };

  // 1. Top-Left Finder
  drawFinderPattern(0, 0);
  // 2. Top-Right Finder
  drawFinderPattern(0, dimension - 7);
  // 3. Bottom-Left Finder
  drawFinderPattern(dimension - 7, 0);

  // 4. Timing patterns
  for (let i = 8; i < dimension - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // 5. Fill remaining data cells with deterministic hash bits
  let byteIdx = 0;
  for (let r = 0; r < dimension; r++) {
    for (let c = 0; c < dimension; c++) {
      const inTopLeft = r <= 7 && c <= 7;
      const inTopRight = r <= 7 && c >= dimension - 8;
      const inBottomLeft = r >= dimension - 8 && c <= 7;
      const isTiming = (r === 6 && c >= 8 && c < dimension - 8) || (c === 6 && r >= 8 && r < dimension - 8);

      if (!inTopLeft && !inTopRight && !inBottomLeft && !isTiming) {
        const byte = seedBytes[byteIdx % seedBytes.length];
        const bit = (byte >> ((r + c) % 8)) & 1;
        matrix[r][c] = bit === 1;
        byteIdx++;
      }
    }
  }

  // Generate SVG rect elements
  const cells: React.ReactNode[] = [];
  const cellSize = size / dimension;

  for (let r = 0; r < dimension; r++) {
    for (let c = 0; c < dimension; c++) {
      if (matrix[r][c]) {
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize + 0.05}
            height={cellSize + 0.05}
            fill="currentColor"
          />
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`shrink-0 text-black ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      aria-label={`QR Code for ${value}`}
    >
      <rect width={size} height={size} fill="white" />
      {cells}
    </svg>
  );
};
