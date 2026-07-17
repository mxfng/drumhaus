import { beginBpmGesture, endBpmGesture } from "@/core/session/bpm-gesture";
import {
  beginHistoryGesture,
  endHistoryGesture,
} from "@/features/preset/history/history";

/**
 * Gesture brackets for the bpm controls: one undo unit (history) plus the
 * session layer's local-bpm-gesture signal, which keeps inbound session
 * tempo from fighting an open drag on a linked follower (#424). Spread
 * into a param control exactly like historyGestureHandlers.
 */
const bpmGestureHandlers = {
  onGestureStart: () => {
    beginHistoryGesture();
    beginBpmGesture();
  },
  onGestureEnd: () => {
    endHistoryGesture();
    endBpmGesture();
  },
} as const;

export { bpmGestureHandlers };
