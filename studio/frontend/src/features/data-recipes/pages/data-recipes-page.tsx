// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the LAiM AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import {
  formatRelativeTime as formatLocaleRelativeTime,
  getLocale,
  translate,
} from "@/i18n";
import { useAppShellReadySignal } from "@/components/app-readiness";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ShineBorder } from "@/components/ui/shine-border";
import { ChevronDownStandardIcon } from "@/lib/chevron-icons";
import { OPEN_LEARNING_RECIPES_ON_ARRIVAL_KEY } from "@/lib/navigation-intents";
import { toastError } from "@/shared/toast";
import {
  Album02Icon,
  CodeIcon,
  CookBookIcon,
  Database02Icon,
  Delete02Icon,
  DocumentAttachmentIcon,
  FunctionIcon,
  GithubIcon,
  Plant01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createRecipeDraft,
  createRecipeFromLearningRecipe,
  deleteRecipe,
  primeRecipeCache,
  useRecipes,
} from "../data/recipes-db";
import { LEARNING_RECIPES } from "../learning-recipes";
import { GuidedTour, useGuidedTourController } from "@/features/tour";
import { buildDataRecipesTourSteps } from "../tour";

type TemplateCard = {
  title: string;
  description: string;
  icon: typeof CookBookIcon;
  difficulty: "Easy" | "Starter" | "Intermediate" | "Advanced";
  learningBadges: string[];
  surfaceClassName: string;
  shineColor: string[];
  learningRecipeId?: string;
};

const TEMPLATE_CARDS: TemplateCard[] = [
  {
    get title() {
      return translate("uxDatarecipes.instructionFromAnswerj87cy");
    },
    get description() {
      return translate("uxDatarecipes.startFromSeedAnswer1s084");
    },
    icon: Plant01Icon,
    difficulty: "Easy",
    learningBadges: ["Seed Dataset", "LLM Text", "Prompting"],
    surfaceClassName:
      "from-emerald-500/15 via-green-500/5 to-transparent dark:from-emerald-400/20 dark:via-green-400/10 dark:to-emerald-950/16",
    shineColor: [
      "rgb(16 185 129 / 0.45)",
      "rgb(34 197 94 / 0.4)",
      "rgb(52 211 153 / 0.45)",
    ],
    learningRecipeId: "instruction-from-answer",
  },
  {
    get title() {
      return translate("uxDatarecipes.pDFDocumentQA9izwn");
    },
    get description() {
      return translate("uxDatarecipes.unstructuredPDFChunksTransformed1vqkm");
    },
    icon: DocumentAttachmentIcon,
    difficulty: "Easy",
    learningBadges: ["Unstructured", "LLM Text"],
    surfaceClassName:
      "from-violet-500/15 via-fuchsia-500/5 to-transparent dark:from-violet-400/20 dark:via-fuchsia-400/10 dark:to-violet-950/16",
    shineColor: [
      "rgb(139 92 246 / 0.45)",
      "rgb(217 70 239 / 0.4)",
      "rgb(168 85 247 / 0.45)",
    ],
    learningRecipeId: "pdf-grounded-qa",
  },
  {
    get title() {
      return translate("uxDatarecipes.oCRDocumentExtractionlje21");
    },
    get description() {
      return translate("uxDatarecipes.useImageContextFrom1lofy");
    },
    icon: Album02Icon,
    difficulty: "Starter",
    learningBadges: ["Vision", "LLM Text", "Image Context"],
    surfaceClassName:
      "from-lime-500/15 via-emerald-500/5 to-transparent dark:from-lime-400/20 dark:via-emerald-400/10 dark:to-lime-950/16",
    shineColor: [
      "rgb(132 204 22 / 0.45)",
      "rgb(16 185 129 / 0.4)",
      "rgb(74 222 128 / 0.45)",
    ],
    learningRecipeId: "ocr-document-extraction",
  },
  {
    get title() {
      return translate("uxDatarecipes.textToPythonxop2l");
    },
    get description() {
      return translate("uxDatarecipes.instructionToCodePairs1f64s");
    },
    icon: CodeIcon,
    difficulty: "Intermediate",
    learningBadges: ["LLM Judge", "LLM Code", "Subcategory", "Category"],
    surfaceClassName:
      "from-amber-500/15 via-orange-500/5 to-transparent dark:from-amber-400/20 dark:via-orange-400/10 dark:to-amber-950/16",
    shineColor: [
      "rgb(245 158 11 / 0.45)",
      "rgb(249 115 22 / 0.4)",
      "rgb(251 146 60 / 0.45)",
    ],
    learningRecipeId: "text-to-python",
  },
  {
    get title() {
      return translate("uxDatarecipes.textToSQL17sot");
    },
    get description() {
      return translate("uxDatarecipes.naturalLanguageToSQLzgx3a");
    },
    icon: Database02Icon,
    difficulty: "Intermediate",
    learningBadges: ["LLM Code", "Prompting", "Drop Columns"],
    surfaceClassName:
      "from-blue-500/15 via-indigo-500/5 to-transparent dark:from-blue-400/20 dark:via-indigo-400/10 dark:to-blue-950/16",
    shineColor: [
      "rgb(59 130 246 / 0.45)",
      "rgb(99 102 241 / 0.4)",
      "rgb(96 165 250 / 0.45)",
    ],
    learningRecipeId: "text-to-sql",
  },
  {
    get title() {
      return translate("uxDatarecipes.structuredOutputsJinjaExpressions1ufow");
    },
    get description() {
      return translate("uxDatarecipes.supportTicketTriageDatasetyj8d6");
    },
    icon: FunctionIcon,
    difficulty: "Advanced",
    learningBadges: ["Structured LLM", "Expression", "Jinja"],
    surfaceClassName:
      "from-cyan-500/15 via-sky-500/5 to-transparent dark:from-cyan-400/20 dark:via-sky-400/10 dark:to-cyan-950/16",
    shineColor: [
      "rgb(6 182 212 / 0.45)",
      "rgb(56 189 248 / 0.4)",
      "rgb(34 211 238 / 0.45)",
    ],
    learningRecipeId: "structured-outputs-jinja",
  },
  {
    get title() {
      return translate("uxDatarecipes.gitHubCrawler1xwz9");
    },
    get description() {
      return translate("uxDatarecipes.crawlRealGithubqfnu7");
    },
    icon: GithubIcon,
    difficulty: "Intermediate",
    learningBadges: ["GitHub", "LLM Text", "Structured LLM"],
    surfaceClassName:
      "from-slate-500/15 via-zinc-500/5 to-transparent dark:from-slate-400/20 dark:via-zinc-400/10 dark:to-slate-950/16",
    shineColor: [
      "rgb(71 85 105 / 0.45)",
      "rgb(100 116 139 / 0.4)",
      "rgb(148 163 184 / 0.45)",
    ],
    learningRecipeId: "github-support-bot",
  },
];

// The card data stores the English enum values it also branches on, so the badge and difficulty
// text is resolved here at render time rather than translated in place.
const DIFFICULTY_LABELS: Record<string, string> = {
  get Easy() { return translate("uxDatarecipes.difficultyEasyjfmuj"); },
  get Starter() { return translate("uxDatarecipes.difficultyStarterzuv6a"); },
  get Intermediate() { return translate("uxDatarecipes.difficultyIntermediate2uv2s"); },
  get Advanced() { return translate("uxDatarecipes.difficultyAdvancedg70jf"); },
};

const BADGE_LABELS: Record<string, string> = {
  get "Seed Dataset"() { return translate("uxDatarecipes.badgeSeedDataset0m0ps"); },
  get "LLM Text"() { return translate("uxDatarecipes.badgeLlmTextwj511"); },
  get Prompting() { return translate("uxDatarecipes.badgePrompting38dz5"); },
  get Unstructured() { return translate("uxDatarecipes.badgeUnstructurednkvin"); },
  get Vision() { return translate("uxModelpicker.visionvap9v"); },
  get "Image Context"() { return translate("uxDatarecipes.badgeImageContext7i5x9"); },
  get "LLM Judge"() { return translate("uxDatarecipes.badgeLlmJudgeov381"); },
  get "LLM Code"() { return translate("uxDatarecipes.badgeLlmCodew7glh"); },
  get Subcategory() { return translate("uxRecipestudio.subcategory1ut5b"); },
  get Category() { return translate("uxRecipestudio.category1cr1m"); },
  get "Drop Columns"() { return translate("uxDatarecipes.badgeDropColumns49iuh"); },
  get "Structured LLM"() { return translate("uxDatarecipes.badgeStructuredLlm7x1y1"); },
  get Expression() { return translate("uxRecipestudio.expression1tcet"); },
};

const LEARNING_RECIPE_BY_ID = new Map(
  LEARNING_RECIPES.map((recipe) => [recipe.id, recipe]),
);

function formatRelativeTime(value: number): string {
  const locale = getLocale();
  const now = Date.now();
  const diffMs = Math.max(0, now - value);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diffMs < minute) {
    return translate("uxDatarecipes.justNowRelatives3t3f");
  }
  if (diffMs < hour) {
    return formatLocaleRelativeTime(locale, -Math.floor(diffMs / minute), "minute");
  }
  if (diffMs < day) {
    return formatLocaleRelativeTime(locale, -Math.floor(diffMs / hour), "hour");
  }
  if (diffMs < week) {
    return formatLocaleRelativeTime(locale, -Math.floor(diffMs / day), "day");
  }
  return formatLocaleRelativeTime(locale, -Math.floor(diffMs / week), "week");
}

function LearningRecipeCards({
  onSelect,
  loadingTemplateId,
}: {
  onSelect: (template: TemplateCard) => void;
  loadingTemplateId: string | null;
}): ReactElement {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-3 4xl:grid-cols-4">
      {TEMPLATE_CARDS.map((template) => {
        const learningRecipe = template.learningRecipeId
          ? LEARNING_RECIPE_BY_ID.get(template.learningRecipeId)
          : undefined;
        const isReady = Boolean(learningRecipe);
        const isLoading =
          template.learningRecipeId !== undefined &&
          loadingTemplateId === template.learningRecipeId;
        const isDisabled = !isReady || isLoading || Boolean(loadingTemplateId);
        const visibleLearningBadges = template.learningBadges.slice(0, 4);
        const extraLearningBadgeCount = Math.max(
          0,
          template.learningBadges.length - 4,
        );
        return (
          <button
            key={template.title}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(template)}
            className={`group shadow-border relative overflow-hidden rounded-2xl bg-gradient-to-br dark:bg-[rgb(249_226_222_/_calc(0.05*var(--contrast-wash-gain,1)))] text-left transition-transform ${template.surfaceClassName} enabled:cursor-pointer enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70`}
          >
            <ShineBorder
              borderWidth={1.2}
              duration={13}
              shineColor={template.shineColor}
            />
            <div className="relative flex h-full min-h-40 flex-col justify-between gap-3 p-4">
              <Badge
                className="absolute right-3 top-3"
                variant={
                  template.difficulty === "Advanced" ? "secondary" : "outline"
                }
              >
                {DIFFICULTY_LABELS[template.difficulty] ?? template.difficulty}
              </Badge>
              <div className="inline-flex size-10 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--foreground)_calc(10%*var(--contrast-edge-gain,1)),transparent)] bg-background/80">
                <HugeiconsIcon
                  icon={template.icon}
                  className="size-5 text-foreground/90"
                />
              </div>
              <div className="space-y-1">
                <p className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
                  {template.title}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground dark:text-zinc-300">
                  {template.description}
                </p>
              </div>
              <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap max-xl:flex-wrap max-xl:gap-y-1">
                {isLoading ? (
                  <Badge variant="outline">{translate("uxDatarecipes.loadingmq24g")}</Badge>
                ) : (
                  <>
                    {visibleLearningBadges.map((badge) => (
                      <Badge
                        key={`${template.title}-${badge}`}
                        variant="outline"
                        className="h-5 shrink-0 px-1.5 text-ui-10 dark:text-zinc-300"
                      >
                        {BADGE_LABELS[badge] ?? badge}
                      </Badge>
                    ))}
                    {extraLearningBadgeCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="h-5 shrink-0 px-1.5 text-ui-10 dark:text-zinc-300"
                      >
                        +{extraLearningBadgeCount}
                      </Badge>
                    ) : null}
                    {isReady ? null : (
                      <Badge
                        variant="secondary"
                        className="h-5 shrink-0 px-1.5 text-ui-10 dark:text-zinc-300"
                      >
                        translate("uxDatarecipes.soonBadgejzi9k")
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function DataRecipesPage(): ReactElement {
  const signalReady = useAppShellReadySignal();
  const navigate = useNavigate();
  const { recipes, ready } = useRecipes();
  const [creatingRecipe, setCreatingRecipe] = useState(false);
  const [learningDialogOpen, setLearningDialogOpen] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(
    null,
  );
  const reloadReadySent = useRef(false);
  const tourSteps = useMemo(
    () => buildDataRecipesTourSteps({ ready, hasRecipes: recipes.length > 0 }),
    [ready, recipes.length],
  );
  const tour = useGuidedTourController({
    id: "data-recipes",
    steps: tourSteps,
  });

  useEffect(() => {
    if (!ready || reloadReadySent.current) {
      return;
    }
    reloadReadySent.current = true;
    signalReady();
  }, [ready, signalReady]);

  useEffect(() => {
    if (sessionStorage.getItem(OPEN_LEARNING_RECIPES_ON_ARRIVAL_KEY) !== "1") {
      return;
    }
    sessionStorage.removeItem(OPEN_LEARNING_RECIPES_ON_ARRIVAL_KEY);
    setLearningDialogOpen(true);
  }, []);

  async function openNewRecipe(): Promise<void> {
    if (creatingRecipe || loadingTemplateId) {
      return;
    }
    setCreatingRecipe(true);
    try {
      const recipe = await createRecipeDraft();
      primeRecipeCache(recipe);
      await navigate({
        to: "/data-recipes/$recipeId",
        params: { recipeId: recipe.id },
      });
    } finally {
      setCreatingRecipe(false);
    }
  }

  async function openLearningRecipe(template: TemplateCard): Promise<void> {
    if (creatingRecipe || loadingTemplateId) {
      return;
    }
    if (!template.learningRecipeId) {
      toastError(translate("uxDatarecipes.learningRecipeNotReadyw3f14"));
      return;
    }
    const recipeTemplate = LEARNING_RECIPE_BY_ID.get(template.learningRecipeId);
    if (!recipeTemplate) {
      toastError(translate("uxDatarecipes.learningRecipeNotFound8p9rp"));
      return;
    }

    setLoadingTemplateId(template.learningRecipeId);
    try {
      const payload = await recipeTemplate.loadPayload();
      const recipe = await createRecipeFromLearningRecipe({
        templateId: recipeTemplate.id,
        templateTitle: recipeTemplate.title,
        payload,
      });
      primeRecipeCache(recipe);
      setLearningDialogOpen(false);
      await navigate({
        to: "/data-recipes/$recipeId",
        params: { recipeId: recipe.id },
      });
    } catch (error) {
      toastError(
        translate("uxDatarecipes.failedToStartLearningnp720"),
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setLoadingTemplateId(null);
    }
  }

  function openRecipe(recipe: (typeof recipes)[number]): void {
    primeRecipeCache(recipe);
    navigate({
      to: "/data-recipes/$recipeId",
      params: { recipeId: recipe.id },
    }).catch(() => undefined);
  }

  async function handleDeleteRecipe(recipeId: string): Promise<void> {
    await deleteRecipe(recipeId);
  }

  const isBusy = creatingRecipe || Boolean(loadingTemplateId);

  return (
    <div className="min-h-[calc(100dvh-var(--studio-titlebar-height,0px))] bg-background">
      <main className="mx-auto w-full max-w-7xl 3xl:max-w-[calc(1440px*var(--ui-space-scale,1))] 4xl:max-w-[calc(1760px*var(--ui-space-scale,1))] px-5 py-8 max-sm:px-4 sm:px-9">
        <GuidedTour {...tour.tourProps} />
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-ui-30 font-semibold leading-[1.04] tracking-[-0.028em] text-foreground sm:text-ui-34">
              {translate("uxDatarecipes.dataRecipeswnh7v")}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {translate("uxDatarecipes.createAndManageLocalf5o42")}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild={true}>
              <Button type="button" data-tour="recipes-new" disabled={isBusy}>
                <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
                {translate("uxDatarecipes.newRecipe1g1zv")}
                <HugeiconsIcon
                  icon={ChevronDownStandardIcon}
                  className="size-4"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  openNewRecipe().catch(() => undefined);
                }}
              >
                <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
                {translate("uxDatarecipes.startEmpty1niia")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setLearningDialogOpen(true);
                }}
              >
                <HugeiconsIcon icon={CookBookIcon} className="size-4" />
                {translate("uxDatarecipes.startFromLearningRecipev65s9")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {ready ? (
          recipes.length === 0 ? (
            <Empty
              data-tour="recipes-templates"
              className="mt-8 border border-dashed border-border/70 dark:border-none"
            >
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={CookBookIcon} className="size-5" />
                </EmptyMedia>
                <EmptyTitle>{translate("uxDatarecipes.noRecipesYetg32el")}</EmptyTitle>
                <EmptyDescription>
                  {translate("uxCopy.browseLearningRecipesBelowd1clx")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="max-w-6xl 4xl:max-w-none items-stretch">
                {/*<Button*/}
                {/*  type="button"*/}
                {/*  variant="secondary"*/}
                {/*  className="mx-auto"*/}
                {/*  onClick={() => setLearningDialogOpen(true)}*/}
                {/*  disabled={isBusy}*/}
                {/*>*/}
                {/*  <HugeiconsIcon icon={CookBookIcon} className="size-4" />*/}
                {/*  Start Tutorial*/}
                {/*</Button>*/}
                <LearningRecipeCards
                  onSelect={(template) => {
                    openLearningRecipe(template).catch(() => undefined);
                  }}
                  loadingTemplateId={loadingTemplateId}
                />
              </EmptyContent>
            </Empty>
          ) : (
            <div data-tour="recipes-list" className="mt-8 space-y-2">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => openRecipe(recipe)}
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/20">
                      <HugeiconsIcon
                        icon={CookBookIcon}
                        className="size-4 text-muted-foreground"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {recipe.name}
                        </p>
                        {recipe.learningRecipeId ? (
                          <Badge variant="outline">{translate("uxDatarecipes.learningRecipenorh8")}</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{translate("uxDatarecipes.lastUpdatedCreatede1yx8", { p1: formatRelativeTime(recipe.updatedAt), p2: formatRelativeTime(recipe.createdAt) })}</p>
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => {
                      handleDeleteRecipe(recipe.id).catch(() => undefined);
                    }}
                    aria-label={translate("uxDatarecipes.deletevau21", { p1: recipe.name })}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="mt-8 rounded-2xl border border-border/70 bg-card px-6 py-10 text-center">
            <p className="text-sm font-medium text-foreground">
              {translate("uxDatarecipes.loadingRecipes1uoba")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {translate("uxDatarecipes.fetchingYourSavedRecipes11y39")}
            </p>
          </div>
        )}
      </main>

      <Dialog open={learningDialogOpen} onOpenChange={setLearningDialogOpen}>
        <DialogContent
          className="sm:max-w-5xl"
          overlayClassName="bg-background/45"
        >
          <DialogHeader>
            <DialogTitle>{translate("uxDatarecipes.learningRecipesw5yj8")}</DialogTitle>
            <DialogDescription>
              {translate("uxDatarecipes.startFromAPrebuiltnxn3k")}
            </DialogDescription>
          </DialogHeader>
          <LearningRecipeCards
            onSelect={(template) => {
              openLearningRecipe(template).catch(() => undefined);
            }}
            loadingTemplateId={loadingTemplateId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

