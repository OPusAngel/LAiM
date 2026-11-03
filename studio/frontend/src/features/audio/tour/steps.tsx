// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import type { TourStep } from "@/features/tour";
import type { AudioWorkflowId } from "../workflows";

const modeStep: TourStep = {
  id: "mode",
  target: "audio-mode",
  get title() {
    return translate("uxAudio.pickAPage1ct1h");
  },
  get body() {
    return (
    <>
      {translate("uxTour.openThePageTitle1edk4")}
    </>
  );
  },
};

const MODEL_STEP_BODY: Record<AudioWorkflowId, string> = {
  get speak() {
    return `${translate("uxTour.textToSpeechModelse4pii")} ${translate("uxTour.loadingOneReplacesTheosq6j")}`;
  },
  get clone() {
    return `${translate("uxTour.modelsThatCanSpeak15zt7")} ${translate("uxTour.loadingOneReplacesTheosq6j")}`;
  },
  get edit() {
    return `${translate("uxTour.modelsThatCanChange1hq71")} ${translate("uxTour.loadingOneReplacesTheosq6j")}`;
  },
  get convert() {
    return `${translate("uxTour.voiceConversionModels2anc8")} ${translate("uxTour.loadingOneReplacesTheosq6j")}`;
  },
  get music() {
    return `${translate("uxTour.musicModels1im3u")} ${translate("uxTour.loadingOneReplacesTheosq6j")}`;
  },
  get separate() {
    return `${translate("uxTour.sourceSeparationModels7i1a0")} ${translate("uxTour.loadingOneReplacesTheosq6j")}`;
  },
  get transcribe() {
    return translate("uxTour.speechRecognitionModelsThey1p9vq");
  },
};

function modelStep(workflow: AudioWorkflowId): TourStep {
  return {
    id: "model",
    target: "audio-model",
    get title() {
      return translate("uxVideo.pickAModelx7b6j");
    },
    get body() {
      return <>{MODEL_STEP_BODY[workflow]}</>;
    },
  };
}

const outputStep: TourStep = {
  id: "output",
  target: "audio-output",
  get title() {
    return translate("uxAudio.output1u5xh");
  },
  get body() {
    return (
    <>
      {translate("uxTour.clipsPlayHereAndrytli")}
    </>
  );
  },
};

export function buildAudioTourSteps({
  workflow,
}: {
  workflow: AudioWorkflowId;
}): TourStep[] {
  if (workflow === "transcribe") {
    return [
      modeStep,
      modelStep(workflow),
      {
        id: "record",
        target: "audio-record",
        get title() {
          return translate("uxAudio.recordOrUpload1cuzc");
        },
        get body() {
          return (
          <>
            {translate("uxTour.recordFromYourMicrophonecujmp")}
          </>
        );
        },
      },
      outputStep,
    ];
  }

  if (workflow === "separate") {
    return [
      modeStep,
      modelStep(workflow),
      {
        id: "source",
        target: "audio-separate-source",
        get title() {
          return translate("uxAudio.track95ckw");
        },
        get body() {
          return (
          <>
            {translate("uxTour.uploadRecordOrPick1s8sn")}
          </>
        );
        },
      },
      {
        id: "output",
        target: "audio-output",
        get title() {
          return translate("uxAudio.stems1komr");
        },
        get body() {
          return (
          <>
            {translate("uxTour.eachStemGetsItsl6ver")}
          </>
        );
        },
      },
    ];
  }

  if (workflow === "clone") {
    return [
      modeStep,
      modelStep(workflow),
      {
        id: "reference",
        target: "audio-clone-reference",
        get title() {
          return translate("uxAudio.referenceClip1liuw");
        },
        get body() {
          return (
          <>
            {translate("uxTour.uploadRecordOrPick1jp9h")}
          </>
        );
        },
      },
      {
        id: "transcript",
        target: "audio-clone-transcript",
        get title() {
          return translate("uxAudio.whatSSaidInin5xk");
        },
        get body() {
          return (
          <>
            {translate("uxTour.someModelsNeedThe2qk5z")}
          </>
        );
        },
      },
      {
        id: "text",
        target: "audio-clone-text",
        get title() {
          return translate("uxAudio.textToSpeak6wm8b");
        },
        get body() {
          return <>{translate("uxTour.whatTheClonedVoice119cf")}</>;
        },
      },
      outputStep,
    ];
  }

  if (workflow === "convert") {
    return [
      modeStep,
      modelStep(workflow),
      {
        id: "source",
        target: "audio-convert-source",
        get title() {
          return translate("uxAudio.recording1s70r");
        },
        get body() {
          return (
          <>
            {translate("uxTour.uploadRecordOrPick164by")}
          </>
        );
        },
      },
      {
        id: "target",
        target: "audio-convert-target",
        get title() {
          return translate("uxAudio.targetVoice1lyes");
        },
        get body() {
          return (
          <>
            {translate("uxTour.theVoiceItShould1qgmy")}
          </>
        );
        },
      },
      {
        ...outputStep,
        get body() {
          return (
          <>
            {translate("uxTour.resultsPlayHereAnd1ydl5")}
          </>
        );
        },
      },
    ];
  }

  if (workflow === "edit") {
    return [
      modeStep,
      modelStep(workflow),
      {
        id: "recording",
        target: "audio-edit-recording",
        get title() {
          return translate("uxAudio.recording1s70r");
        },
        get body() {
          return (
          <>
            {translate("uxTour.uploadRecordOrPick10wjy")}
          </>
        );
        },
      },
      {
        id: "transcript",
        target: "audio-edit-transcript",
        get title() {
          return translate("uxAudio.checkTheTranscript19y9k");
        },
        get body() {
          return (
          <>
            {translate("uxTour.itFillsInBy1u22x")}
          </>
        );
        },
      },
      {
        id: "changes",
        target: "audio-edit-changes",
        get title() {
          return translate("uxAudio.makeYourChanges1wow7");
        },
        get body() {
          return (
          <>
            {translate("uxTour.changeAddOrRemove11zf1")}
          </>
        );
        },
      },
      outputStep,
    ];
  }

  return [
    modeStep,
    modelStep(workflow),
    {
      id: "settings",
      target: "audio-settings",
      get title() {
        return translate("shell.navigation.settings");
      },
      body:
        workflow === "music" ? (
          <>
            {translate("uxTour.lyricsPlusADescriptionvbic3")}
          </>
        ) : (
          <>
            {translate("uxTour.yourTextPlusVoice1g7a8")}
          </>
        ),
    },
    outputStep,
  ];
}
