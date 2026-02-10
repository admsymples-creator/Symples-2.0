"use client";

import { useState, useEffect, useCallback } from "react";
import { WeeklyView } from "@/components/home/WeeklyView";
import { getTasks, getWorkspaceTags } from "@/lib/actions/tasks";
import { Database } from "@/types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

function getTaskFetchRange(): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(diff);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const taskFetchStart = new Date(startOfWeek);
  taskFetchStart.setDate(taskFetchStart.getDate() - 14);
  const taskFetchEnd = new Date(endOfWeek);
  taskFetchEnd.setDate(taskFetchEnd.getDate() + 14);

  return {
    start: taskFetchStart.toISOString(),
    end: taskFetchEnd.toISOString(),
  };
}

interface HomeWeeklyViewClientProps {
  initialTasks: Task[];
  initialPersonalRecurringTasks?: Task[];
  workspaces: { id: string; name: string }[];
  workspaceId: string;
  isPersonal: boolean;
}

export function HomeWeeklyViewClient({
  initialTasks,
  initialPersonalRecurringTasks = [],
  workspaces,
  workspaceId,
  isPersonal,
}: HomeWeeklyViewClientProps) {
  const mergeWeeklyTasks = useCallback((workspaceTasks: Task[], personalTasks: Task[]) => {
    if (isPersonal) return workspaceTasks;

    const personalRecurring = personalTasks.filter(
      (task) =>
        task.is_personal === true &&
        (task.recurrence_type !== null || task.recurrence_parent_id !== null)
    );

    const merged = [...workspaceTasks];
    const existingIds = new Set(workspaceTasks.map((task) => task.id));
    personalRecurring.forEach((task) => {
      if (!existingIds.has(task.id)) {
        merged.push(task);
      }
    });

    return merged;
  }, [isPersonal]);

  const [tasks, setTasks] = useState<Task[]>(() =>
    mergeWeeklyTasks(initialTasks, initialPersonalRecurringTasks)
  );
  const [projectTags, setProjectTags] = useState<string[]>([]);

  useEffect(() => {
    setTasks(mergeWeeklyTasks(initialTasks, initialPersonalRecurringTasks));
  }, [initialTasks, initialPersonalRecurringTasks, mergeWeeklyTasks]);

  useEffect(() => {
    if (!isPersonal && workspaceId) {
      getWorkspaceTags(workspaceId).then(setProjectTags).catch(() => setProjectTags([]));
    } else {
      setProjectTags([]);
    }
  }, [workspaceId, isPersonal]);

  const handleTaskUpdate = useCallback(async () => {
    const range = getTaskFetchRange();
    if (isPersonal) {
      const fetched = await getTasks({
        workspaceId: null,
        assigneeId: "current",
        dueDateStart: range.start,
        dueDateEnd: range.end,
      });
      setTasks(fetched || []);
      return;
    }

    const [workspaceTasks, personalTasks] = await Promise.all([
      getTasks({
        workspaceId,
        assigneeId: "current",
        dueDateStart: range.start,
        dueDateEnd: range.end,
      }),
      getTasks({
        workspaceId: null,
        assigneeId: "current",
        dueDateStart: range.start,
        dueDateEnd: range.end,
      }),
    ]);

    setTasks(mergeWeeklyTasks(workspaceTasks || [], personalTasks || []));
  }, [workspaceId, isPersonal, mergeWeeklyTasks]);

  const handleTaskUpdateOptimistic = useCallback((taskId: string, dueDate: string | null) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, due_date: dueDate } : t))
    );
  }, []);

  const handleTagsUpdateOptimistic = useCallback((taskId: string, tags: string[]) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, tags } : t))
    );
  }, []);

  return (
    <WeeklyView
      tasks={tasks}
      workspaces={workspaces}
      projectTags={projectTags}
      currentWorkspaceId={workspaceId}
      isPersonal={isPersonal}
      originContext="weekly_view"
      onTaskUpdate={handleTaskUpdate}
      onTaskUpdateOptimistic={handleTaskUpdateOptimistic}
      onTagsUpdateOptimistic={handleTagsUpdateOptimistic}
    />
  );
}
