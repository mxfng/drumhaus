import {
  beginHistoryGesture,
  endHistoryGesture,
} from "@/features/preset/history/history";
import {
  beginBpmGesture,
  endBpmGesture,
} from "@/features/transport/lib/bpm-gesture";

/**
 * Gesture brackets for the bpm controls: one undo unit (history) plus the
 * transport's local-bpm-gesture signal, which the Jam adapter observes to
 * keep inbound session tempo from fighting an open drag on a linked follower
 * (#424). Spread into a param control exactly like historyGestureHandlers.
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
