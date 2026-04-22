import type {
  SequenceGroupKind,
  SequenceMessageArrow,
  SequenceMessageKind,
  SequenceNotePlacement,
  SequenceParticipantKind,
  SpecElement,
} from "./types";

const SEQUENCE_LEFT_PADDING = 104;
const SEQUENCE_RIGHT_PADDING = 104;
const SEQUENCE_TOP_PADDING = 28;
const SEQUENCE_HEADER_HEIGHT = 68;
const SEQUENCE_LIFELINE_TOP_GAP = 18;
const SEQUENCE_LIFELINE_BOTTOM_PADDING = 88;
const SEQUENCE_PARTICIPANT_GAP = 190;
const SEQUENCE_MESSAGE_ROW_HEIGHT = 80;
const SEQUENCE_MESSAGE_LINE_OFFSET = 54;
const SEQUENCE_MIRROR_PARTICIPANT_TOP_GAP = 44;
const SEQUENCE_MIRROR_PARTICIPANT_BAND_PADDING = 18;
const SEQUENCE_NOTE_ROW_GAP = 18;
const SEQUENCE_NOTE_MIN_HEIGHT = 78;
const SEQUENCE_NOTE_MIN_WIDTH = 176;
const SEQUENCE_NOTE_MAX_WIDTH = 240;
const SEQUENCE_PARTICIPANT_BOX_SIDE_PADDING = 28;
const SEQUENCE_PARTICIPANT_BOX_TOP_PADDING = 12;
const SEQUENCE_PARTICIPANT_BOX_BOTTOM_PADDING = 18;
const SEQUENCE_PARTICIPANT_BOX_LABEL_RESERVE = 40;
const SEQUENCE_PARTICIPANT_BOX_DESCRIPTION_TOP = 48;
const SEQUENCE_PARTICIPANT_BOX_DESCRIPTION_CHARS_PER_LINE = 40;
const SEQUENCE_PARTICIPANT_BOX_DESCRIPTION_LINE_HEIGHT = 14;
const SEQUENCE_PARTICIPANT_BOX_CONTENT_BOTTOM_GAP = 12;
const SEQUENCE_GROUP_HEADER_HEIGHT = 34;
const SEQUENCE_GROUP_BRANCH_LABEL_HEIGHT = 22;
const SEQUENCE_GROUP_VERTICAL_PADDING = 16;
const SEQUENCE_GROUP_OUTER_GAP = 18;
const SEQUENCE_GROUP_SIDE_PADDING = 44;
const SEQUENCE_GROUP_BRANCH_GAP = 14;
const SEQUENCE_GROUP_DEPTH_INSET = 10;
const SEQUENCE_GROUP_DESCRIPTION_CHARS_PER_LINE = 42;
const SEQUENCE_GROUP_DESCRIPTION_LINE_HEIGHT = 14;
const SEQUENCE_SELF_MESSAGE_WIDTH = 56;
const SEQUENCE_ACTIVATION_BAR_WIDTH = 12;
const SEQUENCE_ACTIVATION_DEPTH_OFFSET = 10;
const SEQUENCE_PARTICIPANT_WIDTH = 138;
const SEQUENCE_PARTICIPANT_LABEL_CHARS_PER_LINE = 16;
const SEQUENCE_PARTICIPANT_DESCRIPTION_CHARS_PER_LINE = 18;

const SEQUENCE_PARTICIPANT_KINDS: SequenceParticipantKind[] = [
  "participant",
  "actor",
  "boundary",
  "control",
  "entity",
  "database",
  "collections",
  "queue",
];
const SEQUENCE_PARTICIPANT_KIND_SET = new Set(SEQUENCE_PARTICIPANT_KINDS);
const SEQUENCE_MESSAGE_KINDS: SequenceMessageKind[] = ["sync", "async", "return"];
const SEQUENCE_MESSAGE_KIND_SET = new Set(SEQUENCE_MESSAGE_KINDS);
const SEQUENCE_MESSAGE_ARROWS: SequenceMessageArrow[] = [
  "->",
  "-->",
  "->>",
  "-->>",
  "<<->>",
  "<<-->>",
  "-x",
  "--x",
  "-)",
  "--)",
];
const SEQUENCE_MESSAGE_ARROW_SET = new Set(SEQUENCE_MESSAGE_ARROWS);
const SEQUENCE_NOTE_PLACEMENTS: SequenceNotePlacement[] = ["left-of", "right-of", "over"];
const SEQUENCE_NOTE_PLACEMENT_SET = new Set(SEQUENCE_NOTE_PLACEMENTS);
const SEQUENCE_GROUP_KINDS: SequenceGroupKind[] = ["alt", "loop", "opt"];
const SEQUENCE_GROUP_KIND_SET = new Set(SEQUENCE_GROUP_KINDS);

export interface SequenceLayoutParticipant {
  key: string;
  label: string;
  kind: SequenceParticipantKind;
  icon?: string;
  description?: string;
  x: number;
  width: number;
  headerY: number;
  headerHeight: number;
  lifelineStartY: number;
  lifelineEndY: number;
  destroyed: boolean;
}

export interface SequenceLayoutParticipantBox {
  key: string;
  label?: string;
  description?: string;
  participants: string[];
  color?: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface SequenceLayoutStep {
  key: string;
  type: "SequenceMessage" | "SequenceNote";
  label: string;
  participantKeys: string[];
}

export interface SequenceLayoutMessage {
  key: string;
  from: string;
  to: string;
  label: string;
  description?: string;
  kind: SequenceMessageKind;
  arrow: SequenceMessageArrow;
  y: number;
  stepIndex: number;
  startX: number;
  endX: number;
  lineLeft: number;
  lineRight: number;
  selfMessage: boolean;
  create: string[];
  destroy: string[];
  activate: string[];
  deactivate: string[];
}

export interface SequenceLayoutNote {
  key: string;
  label?: string;
  body: string;
  placement: SequenceNotePlacement;
  participants: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  stepIndex: number;
}

export interface SequenceLayoutBranch {
  key: string;
  label?: string;
  description?: string;
  top: number;
  height: number;
  startStep: number;
  endStep: number;
}

export interface SequenceLayoutGroup {
  key: string;
  kind: SequenceGroupKind;
  label: string;
  description?: string;
  top: number;
  left: number;
  width: number;
  height: number;
  depth: number;
  branches: SequenceLayoutBranch[];
  startStep: number;
  endStep: number;
}

export interface SequenceLayoutActivation {
  participantKey: string;
  top: number;
  height: number;
  x: number;
  width: number;
  depth: number;
}

export interface SequenceLayout {
  participants: SequenceLayoutParticipant[];
  participantBoxes: SequenceLayoutParticipantBox[];
  messages: SequenceLayoutMessage[];
  notes: SequenceLayoutNote[];
  groups: SequenceLayoutGroup[];
  activations: SequenceLayoutActivation[];
  steps: SequenceLayoutStep[];
  width: number;
  height: number;
  lifelineTop: number;
  lifelineBottom: number;
  mirrorParticipantsY: number;
  mirrorParticipantBandTop: number;
  participantHeaderMaxHeight: number;
}

interface LayoutContext {
  elements: Record<string, SpecElement>;
  participantOrder: string[];
  participantXByKey: Record<string, number>;
  participantIndexByKey: Record<string, number>;
  participants: SequenceLayoutParticipant[];
  stepCounter: number;
}

interface LayoutResult {
  cursorY: number;
  minParticipantIndex: number;
  maxParticipantIndex: number;
  startStep: number;
  endStep: number;
  messages: SequenceLayoutMessage[];
  notes: SequenceLayoutNote[];
  groups: SequenceLayoutGroup[];
  steps: SequenceLayoutStep[];
}

export function buildSequenceLayout(options: {
  elements: Record<string, SpecElement>;
  participantOrder: string[];
  participantBoxOrder?: string[];
  statementOrder: string[];
  topInset?: number;
}): SequenceLayout | null {
  const participants: SequenceLayoutParticipant[] = [];
  const headerY = SEQUENCE_TOP_PADDING + Math.max(0, Math.floor(options.topInset ?? 0));

  options.participantOrder.forEach((key, index) => {
    const element = options.elements[key];
    if (!element || element.type !== "SequenceParticipant") {
      return;
    }

    const x = SEQUENCE_LEFT_PADDING + index * SEQUENCE_PARTICIPANT_GAP;
    const label = toRequiredString(element.props.label);
    const description = toOptionalString(element.props.description);

    participants.push({
      key,
      x,
      width: SEQUENCE_PARTICIPANT_WIDTH,
      headerY,
      headerHeight: estimateParticipantHeaderHeight(label, description),
      label,
      kind: toSequenceParticipantKind(element.props.kind),
      icon: toOptionalString(element.props.icon),
      description,
      lifelineStartY: 0,
      lifelineEndY: 0,
      destroyed: false,
    });
  });

  if (participants.length === 0) {
    return null;
  }

  const participantXByKey = Object.fromEntries(
    participants.map((participant) => [participant.key, participant.x]),
  );
  const participantIndexByKey = Object.fromEntries(
    participants.map((participant, index) => [participant.key, index]),
  );
  const ctx: LayoutContext = {
    elements: options.elements,
    participantOrder: participants.map((participant) => participant.key),
    participantXByKey,
    participantIndexByKey,
    participants,
    stepCounter: 0,
  };

  const maxHeaderHeight = Math.max(
    SEQUENCE_HEADER_HEIGHT,
    ...participants.map((participant) => participant.headerHeight),
  );
  const participantBoxContentReserve = estimateParticipantBoxContentReserve(
    options.participantBoxOrder ?? [],
    options.elements,
  );
  const lifelineTop =
    headerY + maxHeaderHeight + SEQUENCE_LIFELINE_TOP_GAP + participantBoxContentReserve;
  const laidOut = layoutStatements(options.statementOrder, lifelineTop, 0, ctx);
  const mirrorParticipantsY = Math.max(
    lifelineTop + SEQUENCE_MESSAGE_ROW_HEIGHT,
    Math.ceil(laidOut.cursorY + SEQUENCE_MIRROR_PARTICIPANT_TOP_GAP),
  );
  const lifelineBottom = Math.max(lifelineTop + 60, mirrorParticipantsY);
  const participantsWithLifelines = resolveParticipantLifelines(
    participants,
    laidOut.messages,
    mirrorParticipantsY,
    lifelineBottom,
  );
  const participantBoxes = layoutParticipantBoxes({
    boxKeys: options.participantBoxOrder ?? [],
    elements: options.elements,
    participantIndexByKey,
    participants: participantsWithLifelines,
    headerY,
    mirrorParticipantsY,
    maxHeaderHeight,
  });
  const furthestRight = Math.max(
    participants[participants.length - 1]?.x ?? 0,
    ...participantBoxes.map((box) => box.left + box.width),
    ...laidOut.notes.map((note) => note.x + note.width),
    ...laidOut.groups.map((group) => group.left + group.width),
    ...laidOut.messages.map((message) =>
      Math.max(message.lineRight, message.endX + SEQUENCE_SELF_MESSAGE_WIDTH),
    ),
  );
  const furthestBottom = Math.max(
    mirrorParticipantsY + maxHeaderHeight + SEQUENCE_MIRROR_PARTICIPANT_BAND_PADDING,
    ...laidOut.notes.map((note) => note.y + note.height / 2),
    ...laidOut.groups.map((group) => group.top + group.height),
    ...participantBoxes.map((box) => box.top + box.height),
  );
  const width = Math.max(720, Math.ceil(furthestRight + SEQUENCE_RIGHT_PADDING));
  const height = Math.max(420, Math.ceil(furthestBottom + SEQUENCE_LIFELINE_BOTTOM_PADDING / 3));
  const activations = buildActivations(
    laidOut.messages,
    participantXByKey,
    Object.fromEntries(
      participantsWithLifelines.map((participant) => [participant.key, participant.lifelineEndY]),
    ),
    lifelineBottom,
  );

  return {
    participants: participantsWithLifelines,
    participantBoxes,
    messages: laidOut.messages,
    notes: laidOut.notes,
    groups: laidOut.groups,
    activations,
    steps: laidOut.steps,
    width,
    height,
    lifelineTop,
    lifelineBottom,
    mirrorParticipantsY,
    mirrorParticipantBandTop: Math.max(
      0,
      mirrorParticipantsY - SEQUENCE_MIRROR_PARTICIPANT_BAND_PADDING,
    ),
    participantHeaderMaxHeight: maxHeaderHeight,
  };
}

function layoutStatements(
  statementKeys: string[],
  startY: number,
  depth: number,
  ctx: LayoutContext,
): LayoutResult {
  let cursorY = startY;
  let minParticipantIndex = Number.POSITIVE_INFINITY;
  let maxParticipantIndex = Number.NEGATIVE_INFINITY;
  const startStep = ctx.stepCounter;
  const messages: SequenceLayoutMessage[] = [];
  const notes: SequenceLayoutNote[] = [];
  const groups: SequenceLayoutGroup[] = [];
  const steps: SequenceLayoutStep[] = [];

  for (const key of statementKeys) {
    const element = ctx.elements[key];
    if (!element) continue;

    if (element.type === "SequenceMessage") {
      const from = toRequiredString(element.props.from);
      const to = toRequiredString(element.props.to);
      if (!(from in ctx.participantXByKey) || !(to in ctx.participantXByKey)) {
        continue;
      }

      const message = layoutMessage(key, element, cursorY, ctx);

      messages.push(message);
      steps.push({
        key,
        type: "SequenceMessage",
        label: message.label,
        participantKeys: uniqueStrings([from, to, ...message.create, ...message.destroy]),
      });

      const relatedParticipants = uniqueStrings([from, to, ...message.create, ...message.destroy]);
      for (const participantKey of relatedParticipants) {
        const index = ctx.participantIndexByKey[participantKey];
        if (index === undefined) continue;
        minParticipantIndex = Math.min(minParticipantIndex, index);
        maxParticipantIndex = Math.max(maxParticipantIndex, index);
      }
      cursorY += SEQUENCE_MESSAGE_ROW_HEIGHT;
      continue;
    }

    if (element.type === "SequenceNote") {
      const note = layoutNote(key, element, cursorY, ctx);
      if (!note) {
        continue;
      }

      notes.push(note);
      steps.push({
        key,
        type: "SequenceNote",
        label: note.label ?? "Note",
        participantKeys: note.participants,
      });

      for (const participant of note.participants) {
        const index = ctx.participantIndexByKey[participant];
        if (index === undefined) continue;
        minParticipantIndex = Math.min(minParticipantIndex, index);
        maxParticipantIndex = Math.max(maxParticipantIndex, index);
      }

      cursorY += note.height + SEQUENCE_NOTE_ROW_GAP;
      continue;
    }

    if (element.type === "SequenceGroup") {
      const groupResult = layoutGroup(key, element, cursorY, depth, ctx);
      if (!groupResult) {
        continue;
      }

      cursorY = groupResult.cursorY;
      messages.push(...groupResult.messages);
      notes.push(...groupResult.notes);
      groups.push(...groupResult.groups);
      steps.push(...groupResult.steps);

      minParticipantIndex = Math.min(minParticipantIndex, groupResult.minParticipantIndex);
      maxParticipantIndex = Math.max(maxParticipantIndex, groupResult.maxParticipantIndex);
    }
  }

  return {
    cursorY,
    minParticipantIndex,
    maxParticipantIndex,
    startStep,
    endStep: ctx.stepCounter - 1,
    messages,
    notes,
    groups,
    steps,
  };
}

function layoutGroup(
  key: string,
  element: SpecElement,
  startY: number,
  depth: number,
  ctx: LayoutContext,
): LayoutResult | null {
  const childKeys = Array.isArray(element.children) ? element.children : [];
  const groupDescription = toOptionalString(element.props.description);
  const directBranchKeys = childKeys.filter((childKey) => {
    const child = ctx.elements[childKey];
    return child?.type === "SequenceBranch";
  });
  const branchKeys = directBranchKeys.length > 0 ? directBranchKeys : [""];

  let cursorY =
    startY +
    SEQUENCE_GROUP_HEADER_HEIGHT +
    SEQUENCE_GROUP_VERTICAL_PADDING +
    estimateGroupDescriptionReserve(groupDescription);
  let minParticipantIndex = Number.POSITIVE_INFINITY;
  let maxParticipantIndex = Number.NEGATIVE_INFINITY;
  const messages: SequenceLayoutMessage[] = [];
  const notes: SequenceLayoutNote[] = [];
  const groups: SequenceLayoutGroup[] = [];
  const steps: SequenceLayoutStep[] = [];
  const branches: SequenceLayoutBranch[] = [];
  const startStep = ctx.stepCounter;

  for (let index = 0; index < branchKeys.length; index += 1) {
    const branchKey = branchKeys[index] ?? "";
    const branchElement = branchKey ? ctx.elements[branchKey] : undefined;
    const branchTop = cursorY;
    const branchLabel = branchElement ? toOptionalString(branchElement.props.label) : undefined;
    const branchDescription = branchElement
      ? toOptionalString(branchElement.props.description)
      : undefined;
    const branchStatements = branchElement
      ? Array.isArray(branchElement.children)
        ? branchElement.children
        : []
      : childKeys;

    if (branchLabel) {
      cursorY += SEQUENCE_GROUP_BRANCH_LABEL_HEIGHT;
    }

    const laidOut = layoutStatements(branchStatements, cursorY, depth + 1, ctx);

    cursorY = laidOut.cursorY + SEQUENCE_GROUP_VERTICAL_PADDING;

    if (index < branchKeys.length - 1) {
      cursorY += SEQUENCE_GROUP_BRANCH_GAP;
    }

    messages.push(...laidOut.messages);
    notes.push(...laidOut.notes);
    groups.push(...laidOut.groups);
    steps.push(...laidOut.steps);

    minParticipantIndex = Math.min(minParticipantIndex, laidOut.minParticipantIndex);
    maxParticipantIndex = Math.max(maxParticipantIndex, laidOut.maxParticipantIndex);

    branches.push({
      key: branchKey || `${key}__default-branch`,
      label: branchLabel,
      description: branchDescription,
      top: branchTop,
      height: Math.max(
        34,
        cursorY - branchTop - (index < branchKeys.length - 1 ? SEQUENCE_GROUP_BRANCH_GAP : 0),
      ),
      startStep: laidOut.startStep,
      endStep: laidOut.endStep,
    });
  }

  if (!Number.isFinite(minParticipantIndex) || !Number.isFinite(maxParticipantIndex)) {
    minParticipantIndex = 0;
    maxParticipantIndex = Math.max(0, ctx.participants.length - 1);
  }

  const leftParticipant = ctx.participants[minParticipantIndex];
  const rightParticipant = ctx.participants[maxParticipantIndex];

  if (!leftParticipant || !rightParticipant) {
    return null;
  }

  const inset = depth * SEQUENCE_GROUP_DEPTH_INSET;
  const left = Math.max(16, leftParticipant.x - SEQUENCE_GROUP_SIDE_PADDING + inset);
  const right = Math.max(left + 120, rightParticipant.x + SEQUENCE_GROUP_SIDE_PADDING - inset);
  const group: SequenceLayoutGroup = {
    key,
    kind: toSequenceGroupKind(element.props.kind),
    label: toRequiredString(element.props.label),
    description: groupDescription,
    top: startY,
    left,
    width: right - left,
    height: Math.max(64, cursorY - startY),
    depth,
    branches,
    startStep,
    endStep: ctx.stepCounter - 1,
  };

  return {
    cursorY: cursorY + SEQUENCE_GROUP_OUTER_GAP,
    minParticipantIndex,
    maxParticipantIndex,
    startStep,
    endStep: ctx.stepCounter - 1,
    messages,
    notes,
    groups: [...groups, group],
    steps,
  };
}

function layoutMessage(
  key: string,
  element: SpecElement,
  startY: number,
  ctx: LayoutContext,
): SequenceLayoutMessage {
  const from = toRequiredString(element.props.from);
  const to = toRequiredString(element.props.to);
  const startX = ctx.participantXByKey[from] ?? 0;
  const endX = ctx.participantXByKey[to] ?? 0;
  const y = startY + SEQUENCE_MESSAGE_LINE_OFFSET;
  const selfMessage = from === to;

  const lineLeft = selfMessage ? startX : Math.min(startX, endX);
  const lineRight = selfMessage ? startX + SEQUENCE_SELF_MESSAGE_WIDTH : Math.max(startX, endX);

  const message: SequenceLayoutMessage = {
    key,
    from,
    to,
    label: toRequiredString(element.props.label),
    description: toOptionalString(element.props.description),
    kind: toSequenceMessageKind(element.props.kind),
    arrow: toSequenceMessageArrow(element.props.arrow, element.props.kind),
    y,
    stepIndex: ctx.stepCounter,
    startX,
    endX,
    lineLeft,
    lineRight,
    selfMessage,
    create: toStringArray(element.props.create),
    destroy: toStringArray(element.props.destroy),
    activate: toStringArray(element.props.activate),
    deactivate: toStringArray(element.props.deactivate),
  };

  ctx.stepCounter += 1;
  return message;
}

function layoutNote(
  key: string,
  element: SpecElement,
  startY: number,
  ctx: LayoutContext,
): SequenceLayoutNote | null {
  const participants = toStringArray(element.props.participants).filter(
    (participant) => participant in ctx.participantXByKey,
  );

  if (participants.length === 0) {
    return null;
  }

  const placement = toSequenceNotePlacement(element.props.placement);
  const label = toOptionalString(element.props.label);
  const body = toRequiredString(element.props.body);
  const noteHeight = estimateNoteHeight(label, body);
  const noteWidth = estimateNoteWidth(label, body);
  const x = resolveNoteX(placement, participants, noteWidth, ctx);
  const y = startY + noteHeight / 2;
  const note: SequenceLayoutNote = {
    key,
    label,
    body,
    placement,
    participants,
    x,
    y,
    width: noteWidth,
    height: noteHeight,
    stepIndex: ctx.stepCounter,
  };

  ctx.stepCounter += 1;
  return note;
}

function buildActivations(
  messages: SequenceLayoutMessage[],
  participantXByKey: Record<string, number>,
  participantBottomByKey: Record<string, number>,
  fallbackBottom: number,
): SequenceLayoutActivation[] {
  const stacks = new Map<string, Array<{ top: number; depth: number }>>();
  const result: SequenceLayoutActivation[] = [];

  for (const message of messages) {
    for (const participantKey of uniqueStrings(message.deactivate)) {
      const stack = stacks.get(participantKey);
      if (!stack || stack.length === 0) continue;

      const entry = stack.pop();
      if (!entry) continue;

      result.push({
        participantKey,
        top: entry.top,
        height: Math.max(26, message.y - entry.top + 10),
        x:
          (participantXByKey[participantKey] ?? 0) -
          SEQUENCE_ACTIVATION_BAR_WIDTH / 2 +
          entry.depth * SEQUENCE_ACTIVATION_DEPTH_OFFSET,
        width: SEQUENCE_ACTIVATION_BAR_WIDTH,
        depth: entry.depth,
      });
    }

    for (const participantKey of uniqueStrings(message.activate)) {
      if (!(participantKey in participantXByKey)) continue;

      const stack = stacks.get(participantKey) ?? [];
      const depth = stack.length;
      stack.push({
        top: message.y + 6,
        depth,
      });
      stacks.set(participantKey, stack);
    }
  }

  for (const [participantKey, stack] of stacks.entries()) {
    while (stack.length > 0) {
      const entry = stack.pop();
      if (!entry) continue;
      const participantBottom = participantBottomByKey[participantKey] ?? fallbackBottom;

      result.push({
        participantKey,
        top: entry.top,
        height: Math.max(30, participantBottom - entry.top),
        x:
          (participantXByKey[participantKey] ?? 0) -
          SEQUENCE_ACTIVATION_BAR_WIDTH / 2 +
          entry.depth * SEQUENCE_ACTIVATION_DEPTH_OFFSET,
        width: SEQUENCE_ACTIVATION_BAR_WIDTH,
        depth: entry.depth,
      });
    }
  }

  return result;
}

function resolveParticipantLifelines(
  participants: SequenceLayoutParticipant[],
  messages: SequenceLayoutMessage[],
  mirrorParticipantsY: number,
  lifelineBottom: number,
) {
  const startByKey = Object.fromEntries(
    participants.map((participant) => [
      participant.key,
      participant.headerY + participant.headerHeight,
    ]),
  ) as Record<string, number>;
  const endByKey = Object.fromEntries(
    participants.map((participant) => [participant.key, mirrorParticipantsY]),
  ) as Record<string, number>;

  for (const message of messages) {
    for (const participantKey of uniqueStrings(message.create)) {
      if (!(participantKey in startByKey)) continue;
      startByKey[participantKey] = Math.max(startByKey[participantKey] ?? message.y, message.y);
    }

    for (const participantKey of uniqueStrings(message.destroy)) {
      if (!(participantKey in endByKey)) continue;

      const nextEnd = Math.max(
        (startByKey[participantKey] ?? message.y) + 22,
        Math.min(endByKey[participantKey] ?? lifelineBottom, message.y),
      );
      endByKey[participantKey] = nextEnd;
    }
  }

  return participants.map((participant) => ({
    ...participant,
    lifelineStartY: startByKey[participant.key] ?? participant.headerY + participant.headerHeight,
    lifelineEndY: Math.max(
      startByKey[participant.key] ?? participant.headerY + participant.headerHeight,
      endByKey[participant.key] ?? lifelineBottom,
    ),
    destroyed: (endByKey[participant.key] ?? lifelineBottom) < lifelineBottom,
  }));
}

function layoutParticipantBoxes(options: {
  boxKeys: string[];
  elements: Record<string, SpecElement>;
  participantIndexByKey: Record<string, number>;
  participants: SequenceLayoutParticipant[];
  headerY: number;
  mirrorParticipantsY: number;
  maxHeaderHeight: number;
}) {
  const result: SequenceLayoutParticipantBox[] = [];

  for (const key of options.boxKeys) {
    const element = options.elements[key];
    if (!element || element.type !== "SequenceParticipantBox") {
      continue;
    }

    const participantKeys = uniqueStrings(toStringArray(element.props.participants)).filter(
      (participantKey) => participantKey in options.participantIndexByKey,
    );

    if (participantKeys.length === 0) {
      continue;
    }

    const indices = participantKeys
      .map((participantKey) => options.participantIndexByKey[participantKey])
      .filter((index): index is number => index !== undefined)
      .sort((left, right) => left - right);
    const firstParticipant = options.participants[indices[0] ?? -1];
    const lastParticipant = options.participants[indices[indices.length - 1] ?? -1];

    if (!firstParticipant || !lastParticipant) {
      continue;
    }

    const top = options.headerY + options.maxHeaderHeight + SEQUENCE_PARTICIPANT_BOX_TOP_PADDING;
    const left = Math.max(
      8,
      firstParticipant.x - firstParticipant.width / 2 - SEQUENCE_PARTICIPANT_BOX_SIDE_PADDING,
    );
    const right =
      lastParticipant.x + lastParticipant.width / 2 + SEQUENCE_PARTICIPANT_BOX_SIDE_PADDING;
    const bottom =
      options.mirrorParticipantsY +
      options.maxHeaderHeight +
      SEQUENCE_PARTICIPANT_BOX_BOTTOM_PADDING;

    result.push({
      key,
      label: toOptionalString(element.props.label),
      description: toOptionalString(element.props.description),
      participants: participantKeys,
      color: toOptionalString(element.props.color),
      top,
      left,
      width: Math.max(120, right - left),
      height: Math.max(96, bottom - top),
    });
  }

  return result;
}

function resolveNoteX(
  placement: SequenceNotePlacement,
  participants: string[],
  width: number,
  ctx: LayoutContext,
) {
  const firstX = ctx.participantXByKey[participants[0] ?? ""] ?? SEQUENCE_LEFT_PADDING;
  const secondX = ctx.participantXByKey[participants[1] ?? participants[0] ?? ""] ?? firstX;
  const centerX = (firstX + secondX) / 2;

  if (placement === "left-of") {
    return Math.max(18, firstX - width - 38);
  }

  if (placement === "right-of") {
    return Math.max(18, firstX + 38);
  }

  return Math.max(18, centerX - width / 2);
}

function estimateNoteHeight(label: string | undefined, body: string) {
  const labelLines = label ? estimateTextLines(label, 28) : 0;
  const bodyLines = estimateTextLines(body, 28);
  return Math.max(SEQUENCE_NOTE_MIN_HEIGHT, 28 + labelLines * 14 + bodyLines * 16);
}

function estimateParticipantHeaderHeight(label: string, description?: string) {
  const labelLines = Math.max(
    1,
    estimateTextLines(label, SEQUENCE_PARTICIPANT_LABEL_CHARS_PER_LINE),
  );
  const descriptionLines = description
    ? estimateTextLines(description, SEQUENCE_PARTICIPANT_DESCRIPTION_CHARS_PER_LINE)
    : 0;

  const descriptionHeight = descriptionLines > 0 ? 8 + descriptionLines * 14 : 0;

  return Math.max(SEQUENCE_HEADER_HEIGHT, 46 + labelLines * 16 + descriptionHeight);
}

function estimateGroupDescriptionReserve(description?: string) {
  if (!description) {
    return 0;
  }

  const lines = estimateTextLines(description, SEQUENCE_GROUP_DESCRIPTION_CHARS_PER_LINE);

  return 8 + lines * SEQUENCE_GROUP_DESCRIPTION_LINE_HEIGHT;
}

function estimateParticipantBoxContentReserve(
  boxKeys: string[],
  elements: Record<string, SpecElement>,
) {
  let reserve = 0;

  for (const key of boxKeys) {
    const element = elements[key];
    if (!element || element.type !== "SequenceParticipantBox") {
      continue;
    }

    const description = toOptionalString(element.props.description);
    const descriptionReserve = description
      ? SEQUENCE_PARTICIPANT_BOX_DESCRIPTION_TOP +
        estimateTextLines(description, SEQUENCE_PARTICIPANT_BOX_DESCRIPTION_CHARS_PER_LINE) *
          SEQUENCE_PARTICIPANT_BOX_DESCRIPTION_LINE_HEIGHT +
        SEQUENCE_PARTICIPANT_BOX_CONTENT_BOTTOM_GAP
      : SEQUENCE_PARTICIPANT_BOX_LABEL_RESERVE;

    reserve = Math.max(
      reserve,
      Math.max(SEQUENCE_PARTICIPANT_BOX_LABEL_RESERVE, descriptionReserve),
    );
  }

  return reserve;
}

function estimateNoteWidth(label: string | undefined, body: string) {
  const widest = Math.max(maxLineLength(label), maxLineLength(body));
  return Math.max(
    SEQUENCE_NOTE_MIN_WIDTH,
    Math.min(SEQUENCE_NOTE_MAX_WIDTH, 110 + Math.min(36, widest) * 3.1),
  );
}

function estimateTextLines(value: string, charsPerLine: number) {
  const normalized = value.split(/\r?\n/);

  return normalized.reduce((total, line) => {
    const length = Math.max(1, line.trim().length);
    return total + Math.max(1, Math.ceil(length / charsPerLine));
  }, 0);
}

function maxLineLength(value?: string) {
  if (!value) return 0;
  return value.split(/\r?\n/).reduce((max, line) => Math.max(max, line.trim().length), 0);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function toRequiredString(value: unknown) {
  return toOptionalString(value) ?? "";
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => toOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function toSequenceParticipantKind(value: unknown): SequenceParticipantKind {
  if (
    typeof value === "string" &&
    SEQUENCE_PARTICIPANT_KIND_SET.has(value as SequenceParticipantKind)
  ) {
    return value as SequenceParticipantKind;
  }

  return "participant";
}

function toSequenceMessageKind(value: unknown): SequenceMessageKind {
  if (typeof value === "string" && SEQUENCE_MESSAGE_KIND_SET.has(value as SequenceMessageKind)) {
    return value as SequenceMessageKind;
  }

  return "sync";
}

function toSequenceMessageArrow(value: unknown, kindValue: unknown): SequenceMessageArrow {
  if (typeof value === "string" && SEQUENCE_MESSAGE_ARROW_SET.has(value as SequenceMessageArrow)) {
    return value as SequenceMessageArrow;
  }

  const kind = toSequenceMessageKind(kindValue);
  if (kind === "async") {
    return "-)";
  }

  if (kind === "return") {
    return "-->>";
  }

  return "->>";
}

function toSequenceNotePlacement(value: unknown): SequenceNotePlacement {
  if (
    typeof value === "string" &&
    SEQUENCE_NOTE_PLACEMENT_SET.has(value as SequenceNotePlacement)
  ) {
    return value as SequenceNotePlacement;
  }

  return "over";
}

function toSequenceGroupKind(value: unknown): SequenceGroupKind {
  if (typeof value === "string" && SEQUENCE_GROUP_KIND_SET.has(value as SequenceGroupKind)) {
    return value as SequenceGroupKind;
  }

  return "opt";
}
