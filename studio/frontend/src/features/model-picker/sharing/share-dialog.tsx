// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { translate } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isTauri } from "@/lib/api-base";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { toast } from "@/lib/toast";
import { useId, useMemo, useState } from "react";
import type { ModelPickTarget } from "../components/model-selector/types";
import {
  DEFAULT_PER_MODEL_CONFIG,
  type PerModelConfig,
} from "../model-config/per-model-config";
import { sharedExtraArgsError } from "./extra-args";
import {
  SHARED_CONFIG_FIELDS,
  SHARED_CONFIG_KEYS,
  type SharedConfigKey,
  formatSharedConfigValue,
} from "./fields";
import {
  DESKTOP_RUN_CONFIG_URL_WARNING_LENGTH,
  type SharedRunConfig,
  createRunConfigLink,
  isShareableModelId,
} from "./links";

const SHARING_DEFAULTS: PerModelConfig = {
  ...DEFAULT_PER_MODEL_CONFIG,
  gpuMemoryMode: "auto",
  gpuLayers: -1,
  nCpuMoe: 0,
  selectedGpuIds: null,
  selectedGpuIndexKind: null,
};

const loopbackHostname = /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])$/;

function linkPreview(value: SharedRunConfig, destination: string) {
  try {
    return {
      link: createRunConfigLink(
        value,
        destination === "browser" ? window.location.href : undefined,
      ),
      error: "",
    };
  } catch (cause) {
    return {
      link: "",
      error:
        cause instanceof Error ? cause.message : translate("uxModelpicker.couldNotCreateThiswrkte"),
    };
  }
}

export function ShareRunConfigDialog({
  target,
  config: sourceConfig,
  onClose,
}: {
  target: ModelPickTarget;
  config: PerModelConfig;
  onClose: () => void;
}) {
  const id = useId();
  const config = useMemo(
    () => ({
      ...sourceConfig,
      llamaExtraArgs: sourceConfig.llamaExtraArgs ?? null,
    }),
    [sourceConfig],
  );
  const model = target.configId ?? target.id;
  const shareableModel = isShareableModelId(model);
  const fields = useMemo(
    () =>
      SHARED_CONFIG_KEYS.filter((key) => config[key] !== undefined).map(
        (key) => {
          const error =
            key === "llamaExtraArgs" && config[key] !== null
              ? sharedExtraArgsError(config[key])
              : SHARED_CONFIG_FIELDS[key].valid(config[key])
                ? null
                : (SHARED_CONFIG_FIELDS[key].error ??
                  translate("uxModelpicker.thisValueCannotBed1d33"));
          const detail =
            error === null
              ? formatSharedConfigValue(key, config)
              : key === "llamaExtraArgs"
                ? `Excluded: ${error} Edit Extra Arguments in Run settings to share them.`
                : error;
          return { key, valid: error === null, detail };
        },
      ),
    [config],
  );
  const [includeModel, setIncludeModel] = useState(shareableModel);
  const [includeVariant, setIncludeVariant] = useState(
    shareableModel && Boolean(target.ggufVariant),
  );
  const remoteAddress =
    !isTauri && !loopbackHostname.test(window.location.hostname);
  const [destination, setDestination] = useState(
    isTauri || remoteAddress ? "desktop" : "browser",
  );
  const [selected, setSelected] = useState<Set<SharedConfigKey>>(
    () =>
      new Set(
        fields
          .filter(
            ({ key, valid }) =>
              valid &&
              (key === "llamaExtraArgs"
                ? (config.llamaExtraArgs?.length ?? 0) > 0
                : JSON.stringify(config[key]) !==
                  JSON.stringify(SHARING_DEFAULTS[key])),
          )
          .map(({ key }) => key),
      ),
  );
  const [copying, setCopying] = useState(false);
  const { link, error } = useMemo(
    () =>
      linkPreview(
        {
          ...(includeModel ? { model } : {}),
          ...(includeVariant && target.ggufVariant
            ? { ggufVariant: target.ggufVariant }
            : {}),
          config: Object.fromEntries(
            [...selected].map((key) => [key, config[key]]),
          ),
        },
        destination,
      ),
    [
      config,
      selected,
      includeModel,
      model,
      includeVariant,
      target.ggufVariant,
      destination,
    ],
  );
  const choice = (
    key: string,
    label: string,
    checked: boolean,
    change: (checked: boolean) => void,
    detail?: string,
    disabled = false,
  ) => (
    <div key={key}>
      <div className="flex min-h-8 items-center gap-3">
        <Checkbox
          id={`${id}-${key}`}
          aria-describedby={
            detail !== undefined ? `${id}-${key}-detail` : undefined
          }
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => change(value === true)}
        />
        <label
          htmlFor={`${id}-${key}`}
          className={`flex min-w-0 flex-1 items-baseline justify-between gap-4 text-ui-13 ${disabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer text-foreground"}`}
        >
          <span className="shrink-0">{label}</span>
          {detail !== undefined && !disabled && (
            <span
              id={`${id}-${key}-detail`}
              aria-hidden={true}
              title={detail}
              className="min-w-0 truncate text-ui-12 text-muted-foreground"
            >
              {detail}
            </span>
          )}
        </label>
      </div>
      {detail !== undefined && disabled && (
        <p
          id={`${id}-${key}-detail`}
          className="pb-2 pl-7 text-ui-12 leading-snug text-muted-foreground"
        >
          {detail}
        </p>
      )}
    </div>
  );
  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-5 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{translate("uxCopy.shareRunSettings172gl")}</DialogTitle>
          <DialogDescription>{translate("uxModelpicker.chooseWhatToIncludeu7bms")}</DialogDescription>
        </DialogHeader>
        <div className="@container flex min-h-0 flex-col border-y border-border/60">
          <div className="border-b border-border/60 py-2">
            {shareableModel ? (
              choice("model", "Model", includeModel, setIncludeModel, model)
            ) : (
              <p className="py-1.5 text-ui-12 leading-snug text-muted-foreground">
                {translate("uxCopy.thisModelUsesA1jti3")}
              </p>
            )}
            {target.ggufVariant &&
              choice(
                "variant",
                translate("uxModelpicker.gGUFVariantepwpg"),
                includeVariant,
                setIncludeVariant,
                target.ggufVariant,
              )}
          </div>
          <div className="hover-scrollbar -mr-7 min-h-0 flex-1 overflow-y-auto py-2 sm:max-h-75">
            <div className="w-[100cqw]">
              {fields.map(({ key, valid, detail }) =>
                choice(
                  key,
                  SHARED_CONFIG_FIELDS[key].label,
                  selected.has(key),
                  (checked) =>
                    setSelected(
                      (current) =>
                        new Set(
                          checked
                            ? [...current, key]
                            : [...current].filter((item) => item !== key),
                        ),
                    ),
                  detail,
                  !valid,
                ),
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex min-h-9 items-center justify-between gap-4">
              {isTauri ? (
                <>
                  <span className="text-ui-13 font-medium">{translate("uxModelpicker.openInv581u")}</span>
                  <span className="text-ui-13 text-muted-foreground">
                    {translate("uxModelpicker.desktoprs698")}
                  </span>
                </>
              ) : (
                <>
                  <label
                    htmlFor={`${id}-destination`}
                    className="text-ui-13 font-medium"
                  >{translate("uxModelpicker.openInv581u")}</label>
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger id={`${id}-destination`} className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desktop">Desktop</SelectItem>
                      <SelectItem value="browser">Web</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
            <p
              className={
                destination === "browser" && remoteAddress
                  ? "text-ui-12 leading-snug text-amber-600 dark:text-amber-500"
                  : "text-ui-12 leading-snug text-muted-foreground"
              }
            >
              {destination !== "browser"
                ? translate("uxModelpicker.theRecipientNeedsLAiM1r6g6")
                : remoteAddress
                  ? "This link contains this Studio's network address. Anyone with it and your password can sign in and control this computer. Share it only with people who should use this Studio; otherwise share a Desktop link."
                  : translate("uxModelpicker.thisLinkContainsYour7c280")}
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label
                htmlFor={`${id}-link`}
                className="flex h-9 min-w-0 flex-1 cursor-text items-center rounded-full border border-border bg-background px-3.5 transition-colors focus-within:border-ring dark:border-transparent dark:bg-[rgb(249_226_222_/_calc(0.06*var(--contrast-wash-gain,1)))] dark:focus-within:bg-[rgb(249_226_222_/_calc(0.12*var(--contrast-wash-gain,1)))]"
              >
                <span className="sr-only">{translate("uxModelpicker.shareableLink95puu")}</span>
                <Textarea
                  id={`${id}-link`}
                  readOnly={true}
                  value={link}
                  rows={1}
                  fieldSizing="fixed"
                  onKeyUp={(event) => {
                    if (event.key === "Tab") {
                      event.currentTarget.select();
                    }
                  }}
                  className="no-scrollbar! min-h-0 flex-1 overflow-x-auto overflow-y-hidden whitespace-pre rounded-none border-0 bg-transparent p-0 py-1 font-mono text-ui-12 leading-4 text-muted-foreground md:text-ui-12 dark:bg-transparent dark:focus-visible:bg-transparent"
                />
              </label>
              <Button
                className="shrink-0 px-4"
                disabled={!link || copying}
                onClick={async () => {
                  setCopying(true);
                  try {
                    if (await copyToClipboard(link)) {
                      toast.success(translate("uxModelpicker.runSettingsLinkCopied5knqu"));
                    } else {
                      toast.error(
                        translate("uxModelpicker.couldNotCopyThe1diuz"),
                      );
                    }
                  } finally {
                    setCopying(false);
                  }
                }}
              >{translate("uxModelpicker.copyLinkyp4fl")}</Button>
            </div>
            {error && (
              <p role="alert" className="text-ui-12 text-destructive">
                {error}
              </p>
            )}
            {destination === "desktop" &&
              link.length > DESKTOP_RUN_CONFIG_URL_WARNING_LENGTH && (
                <output className="block text-ui-12 text-amber-700 dark:text-amber-300">{translate("uxModelpicker.longDesktopLinksMayp1ky4", { p1: !isTauri && " or open in Web" })}</output>
              )}
            <p className="text-ui-12 leading-snug text-muted-foreground">
              {translate("uxCopy.anyoneWithTheLink2xgm6")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

