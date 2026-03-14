type LightNodeRegistration = {
  id?: string;
  ref: React.RefObject<HTMLElement | null>;
  group?: string;
  glowColor?: string;
  weight?: number;
};

type RegisteredLightNode = {
  id: string;
  ref: React.RefObject<HTMLElement | null>;
  group: string;
  glowColor?: string;
  weight: number;
};

type PositionedLightNode = RegisteredLightNode & {
  rect: DOMRect;
  center: { x: number; y: number };
};

export type { LightNodeRegistration, RegisteredLightNode, PositionedLightNode };
