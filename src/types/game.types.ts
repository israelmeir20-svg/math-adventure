/**
 * Core domain types for the Math Adventure game.
 * Pure types only - no runtime logic, no UI.
 */

export type Operator = '+' | '-' | '×' | '÷';

export type HexTileType =
  | 'street'
  | 'cookieBakery'
  | 'pizzaBakery'
  | 'kiosk'
  | 'truckHub'
  | 'farm'
  | 'resource'
  | 'bridge';

export type MathProblemType =
  | 'multiplication'
  | 'division'
  | 'addition'
  | 'subtraction'
  | 'numberLine'
  | 'placeValue';

/** Which visual aid the UI should render next to a problem. */
export type VisualHelperType =
  | 'array'
  | 'equalGroups'
  | 'placeValueBlocks'
  | 'numberLine'
  | 'dotGrid'
  | 'none';

export type BonusMiniGameType =
  | 'shadowMatch'
  | 'simonFirefly'
  | 'foxShell'
  | 'memoryCards'
  | 'bouncingBalls'
  | 'lightedWindows'
  | 'oddOneOut';

export type LifelineId = 'fiftyFifty' | 'dotGrid' | 'eraser';

export type ResourceId = 'wood' | 'stone' | 'wheat' | 'wool';

/** Axial hex coordinate. */
export interface HexCoordinate {
  q: number;
  r: number;
}

/** A single spelling-block style node on the adventure map. */
export interface Decoration {
  id: string;
  kind: string;
  position: HexCoordinate;
}

export interface HexTile {
  id: string;
  coordinate: HexCoordinate;
  type: HexTileType;
  isUnlocked: boolean;
  /** 1..5 - drives difficulty of the generated problems. */
  level: number;
  currentMathProblem: MathProblem | null;
  assignedDecorations: Decoration[];
  /** Only meaningful on `type: 'resource'` tiles - picks the resource variety. */
  resourceKind?: ResourceId;
}

export interface PlayerInventory {
  cookies: number;
  starCookies: number;
  resources: Record<ResourceId, number>;
  unlockedAnimals: string[];
  lifelines: Record<LifelineId, number>;
  /** Ids of one-time shop items already purchased (decorations, treats). */
  ownedDecorations: string[];
}

/** Multiplier applies to rewards, driven by consecutive correct answers. */
export interface StreakState {
  multiplier: 1 | 2;
  consecutiveCorrect: number;
}

export interface MathProblem {
  id: string;
  type: MathProblemType;
  questionTextHebrew: string;
  operandA: number;
  operandB: number;
  operator: Operator;
  correctAnswer: number;
  /** Multiple-choice options, already shuffled - Hebrew labels allowed. */
  options: number[];
  hintHebrew: string;
  visualHelperType: VisualHelperType;
  /** Extra payload for visuals (array rows/cols, number line start/step, ...). */
  visualHelperData?: VisualHelperData;
}

export interface VisualHelperData {
  rows?: number;
  columns?: number;
  groups?: number;
  perGroup?: number;
  lineStart?: number;
  lineEnd?: number;
  hops?: number;
  hopSize?: number;
  hundreds?: number;
  tens?: number;
  ones?: number;
}

/** Feed-forward record used by the spaced-repetition scheduler. */
export interface MistakeRecord {
  problemKey: string;
  operandA: number;
  operandB: number;
  operator: Operator;
  attempts: number;
  mistakes: number;
  lastSeenAt: number;
  /** Timestamp before which the problem should not be re-served. */
  dueAt: number;
}

export interface MistakeTracker {
  records: Record<string, MistakeRecord>;
}
