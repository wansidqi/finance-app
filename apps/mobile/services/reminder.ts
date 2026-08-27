import { ReminderInterface } from "@/interface/reminder";
import {
  createReminder as localCreateReminder,
  deleteReminder as localDeleteReminder,
  getAllReminders,
  getReminderById,
  markReminderPaid as localMarkReminderPaid,
  pauseReminder as localPauseReminder,
  resumeReminder as localResumeReminder,
  updateReminder as localUpdateReminder,
} from "@/local/reminder-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const REMINDERS_KEY = ["reminders"];

export const useGetReminders = () => {
  return useQuery({
    queryKey: REMINDERS_KEY,
    queryFn: getAllReminders,
  });
};

export const useGetReminderById = (id: number) => {
  return useQuery({
    queryKey: [`reminders/${id}`],
    queryFn: () => getReminderById(id),
  });
};

export const useCreateReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ReminderInterface>) => localCreateReminder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY });
    },
  });
};

export const useUpdateReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ReminderInterface> }) =>
      localUpdateReminder(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY });
      queryClient.invalidateQueries({ queryKey: [`reminders/${variables.id}`] });
    },
  });
};

export const useDeleteReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => localDeleteReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY });
    },
  });
};

export const useMarkReminderPaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paidDate }: { id: number; paidDate?: string }) =>
      localMarkReminderPaid(id, paidDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY });
    },
  });
};

export const useSetReminderPaused = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paused }: { id: number; paused: boolean }) =>
      paused ? localPauseReminder(id) : localResumeReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY });
    },
  });
};
