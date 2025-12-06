export type LightNodeRegistration = {
  id?: string;
  ref: React.RefObject<HTMLElement | null>;
  group?: string;
  glowColor?: string;
  weight?: number;
};

export type RegisteredLightNode = {
  id: string;
  ref: React.RefObject<HTMLElement | null>;
  group: string;
  glowColor?: string;
  weight: number;
};

export type PositionedLightNode = RegisteredLightNode & {
  rect: DOMRect;
  center: { x: number; y: number };
};
