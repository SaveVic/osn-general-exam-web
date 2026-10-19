"use client";

import React, { useMemo } from "react";
import type { ClientQuestionItem } from "@/actions/exam-session";
import type { ChoiceOption } from "@/lib/validations/question";
import { useExamSessionStore } from "@/lib/stores/exam-session-store";
import { SingleChoiceInput } from "./single-choice-input";
import { MultipleChoiceInput } from "./multiple-choice-input";
import { ShortAnswerInput } from "./short-answer-input";

interface QuestionOptionsProps {
  question: ClientQuestionItem;
  disabled?: boolean;
}

export function QuestionOptions({ question, disabled = false }: QuestionOptionsProps) {
  const currentAnswer = useExamSessionStore((state) => state.answersMap[question.id]);
  const setAnswer = useExamSessionStore((state) => state.setAnswer);
  const clearAnswer = useExamSessionStore((state) => state.clearAnswer);

  const parsedOptions: ChoiceOption[] = useMemo(() => {
    if (Array.isArray(question.options)) {
      return question.options as ChoiceOption[];
    }
    return [];
  }, [question.options]);

  if (question.question_type === "single_choice") {
    const selectedOptionId =
      currentAnswer && typeof currentAnswer === "object" && "selected" in currentAnswer
        ? (currentAnswer as { selected?: string }).selected
        : typeof currentAnswer === "string"
        ? currentAnswer
        : null;

    return (
      <SingleChoiceInput
        questionId={question.id}
        options={parsedOptions}
        selectedOptionId={selectedOptionId}
        disabled={disabled}
        onSelectOption={(optionId) => {
          if (disabled) return;
          setAnswer(question.id, { selected: optionId });
        }}
        onClearOption={() => {
          if (disabled) return;
          clearAnswer(question.id);
        }}
      />
    );
  }

  if (question.question_type === "multiple_choice") {
    const selectedOptionIds =
      currentAnswer && typeof currentAnswer === "object" && "selected" in currentAnswer && Array.isArray((currentAnswer as { selected?: unknown[] }).selected)
        ? ((currentAnswer as { selected: string[] }).selected)
        : [];

    return (
      <MultipleChoiceInput
        questionId={question.id}
        options={parsedOptions}
        selectedOptionIds={selectedOptionIds}
        disabled={disabled}
        onToggleOption={(optionId) => {
          if (disabled) return;
          const next = selectedOptionIds.includes(optionId)
            ? selectedOptionIds.filter((id) => id !== optionId)
            : [...selectedOptionIds, optionId];

          if (next.length === 0) {
            clearAnswer(question.id);
          } else {
            setAnswer(question.id, { selected: next });
          }
        }}
        onClearOptions={() => {
          if (disabled) return;
          clearAnswer(question.id);
        }}
      />
    );
  }

  if (question.question_type === "short_answer") {
    const currentText =
      currentAnswer && typeof currentAnswer === "object" && "text" in currentAnswer
        ? String((currentAnswer as { text?: unknown }).text ?? "")
        : typeof currentAnswer === "string"
        ? currentAnswer
        : "";

    return (
      <ShortAnswerInput
        questionId={question.id}
        currentText={currentText}
        disabled={disabled}
        onChangeText={(text) => {
          if (disabled) return;
          if (!text.trim()) {
            clearAnswer(question.id);
          } else {
            setAnswer(question.id, { text });
          }
        }}
        onClearText={() => {
          if (disabled) return;
          clearAnswer(question.id);
        }}
      />
    );
  }

  return null;
}

