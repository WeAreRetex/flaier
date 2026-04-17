import { addCollection } from "@iconify/vue/dist/offline";
import logosIconSet from "@iconify-json/logos/icons.json";
import lucideIconSet from "@iconify-json/lucide/icons.json";
import type { SequenceParticipantKind } from "../../types";

const DEFAULT_SEQUENCE_PARTICIPANT_ICONS: Record<SequenceParticipantKind, string> = {
  participant: "lucide:square-terminal",
  actor: "lucide:user-round",
  boundary: "lucide:app-window",
  control: "lucide:sliders-horizontal",
  entity: "lucide:box",
  database: "lucide:database",
  collections: "lucide:layers-3",
  queue: "lucide:list-ordered",
};

let sequenceIconCollectionsRegistered = false;

function ensureSequenceIconCollections() {
  if (sequenceIconCollectionsRegistered) {
    return;
  }

  addCollection(logosIconSet);
  addCollection(lucideIconSet);
  sequenceIconCollectionsRegistered = true;
}

export function resolveSequenceParticipantIcon(kind: SequenceParticipantKind, icon?: string) {
  ensureSequenceIconCollections();
  return icon ?? DEFAULT_SEQUENCE_PARTICIPANT_ICONS[kind];
}
