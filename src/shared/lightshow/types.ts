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

export type LightRigContextValue = {
  registerNode: (node: LightNodeRegistration) => () => void;
  setLightState: (ids: string | string[], isOn: boolean) => void;
  playIntroWave: () => void;
  isIntroPlaying: boolean;
  isPointerLocked: boolean;
};
