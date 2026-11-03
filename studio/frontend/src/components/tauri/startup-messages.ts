import { translate, type TranslationKey } from "@/i18n";

export const INITIAL_STARTUP_MESSAGE = "Starting LAiM...";

export const MODELS_STARTUP_MESSAGE = "Loading models...";
export const SERVER_STARTUP_MESSAGE = "Nearly done...";
export const UPDATE_STARTUP_MESSAGE = "Finishing update...";
export const STATUS_MESSAGE_ROTATION_MS = 5_000;

export interface InstallProgressMessage {
  title: string;
  subtitle: string;
}

const INSTALL_PHASE_MESSAGES: readonly InstallProgressMessage[] = [
  {
    get title() { return translate("uxComponents.preparingYourWorkspacees1kf"); },
    get subtitle() { return translate("uxComponents.checkingWhatThisComputer31zs6"); },
  },
  {
    get title() { return translate("uxComponents.downloadingRequiredComponents931kb"); },
    get subtitle() { return translate("uxComponents.creatingYourLocalEnvironment071u2"); },
  },
  {
    get title() { return translate("uxComponents.installingLAiM27f7r"); },
    get subtitle() { return translate("uxComponents.settingUpLocalAI6j8l6"); },
  },
  {
    get title() { return translate("uxComponents.finishingSetup3vue0"); },
    get subtitle() { return translate("uxComponents.gettingEverythingReadylp2ii"); },
  },
];

const INSTALL_WAITING_SUBTITLES = [
  "Setup will continue automatically.",
  "This can take a few minutes.",
  "Some components take longer to configure.",
] as const;

function normalizedRotationIndex(index: number, length: number): number {
  const wholeIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  return ((wholeIndex % length) + length) % length;
}

export function installProgressMessage(
  currentStepIndex: number,
  rotationIndex = 0,
): InstallProgressMessage {
  const phaseIndex =
    currentStepIndex < 2 ? 0 : currentStepIndex < 4 ? 1 : currentStepIndex < 6 ? 2 : 3;
  const phaseMessage = INSTALL_PHASE_MESSAGES[phaseIndex];
  if (rotationIndex === 0) return phaseMessage;

  return {
    title: phaseMessage.title,
    subtitle: startupMessageText(
      INSTALL_WAITING_SUBTITLES[
        normalizedRotationIndex(rotationIndex - 1, INSTALL_WAITING_SUBTITLES.length)
      ],
    ),
  };
}

export type StartupMessage =
  | typeof INITIAL_STARTUP_MESSAGE
  | typeof MODELS_STARTUP_MESSAGE
  | typeof SERVER_STARTUP_MESSAGE
  | typeof UPDATE_STARTUP_MESSAGE;

const STARTUP_WAITING_MESSAGES = [
  INITIAL_STARTUP_MESSAGE,
  "Loading projects...",
] as const;

export function startupWaitingMessage(
  phaseMessage: StartupMessage,
  rotationIndex: number,
): string {
  if (phaseMessage !== INITIAL_STARTUP_MESSAGE) return phaseMessage;
  return STARTUP_WAITING_MESSAGES[
    normalizedRotationIndex(rotationIndex, STARTUP_WAITING_MESSAGES.length)
  ];
}

export function startupMessageFromLog(
  current: StartupMessage,
  line: string,
): StartupMessage {
  const normalized = line.trim();
  if (normalized === "- Starting server...") {
    return SERVER_STARTUP_MESSAGE;
  }
  if (
    current === INITIAL_STARTUP_MESSAGE &&
    normalized === "- loading PyTorch, LAiM and Transformers..."
  ) {
    return MODELS_STARTUP_MESSAGE;
  }
  return current;
}

// The sentinels above are compared by identity, so they stay English; only the copy shown
// to the user is looked up here.
const STARTUP_MESSAGE_KEYS: Record<string, TranslationKey> = {
  [INITIAL_STARTUP_MESSAGE]: "uxComponents.startingLAiMMsg7kq2",
  [MODELS_STARTUP_MESSAGE]: "uxComponents.loadingModelsMsg3vt8",
  [SERVER_STARTUP_MESSAGE]: "uxComponents.nearlyDoneMsg9wz4",
  [UPDATE_STARTUP_MESSAGE]: "uxComponents.finishingUpdateMsg2hb6",
  "Loading projects...": "uxComponents.loadingProjectsMsg5rc1",
  "Setup will continue automatically.": "uxComponents.setupContinuesAutoMsg8yd3",
  "This can take a few minutes.": "uxComponents.thisTakesFewMinMsg4ke9",
  "Some components take longer to configure.": "uxComponents.someComponentsLongerMsg6tn5",
};

export function startupMessageText(message: string): string {
  const key = STARTUP_MESSAGE_KEYS[message];
  return key === undefined ? message : translate(key);
}
